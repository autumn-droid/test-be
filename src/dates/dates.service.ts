import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DateEntity, DateDocument } from './schemas/date.schema';
import { JoinRequest, JoinRequestDocument } from './schemas/join-request.schema';
import { CreateDateDto } from './dto/create-date.dto';
import { UpdateDateDto } from './dto/update-date.dto';
import { DateResponseDto } from './dto/date-response.dto';

@Injectable()
export class DatesService {
  private readonly logger = new Logger(DatesService.name);

  constructor(
    @InjectModel(DateEntity.name) private dateModel: Model<DateDocument>,
    @InjectModel(JoinRequest.name) private joinRequestModel: Model<JoinRequestDocument>,
  ) {}

  async create(createDateDto: CreateDateDto, ownerId: string): Promise<DateResponseDto> {
    // Validate startDateTime is in the future
    const startDateTime = new Date(createDateDto.startDateTime);
    if (startDateTime <= new Date()) {
      throw new BadRequestException('Start date and time must be in the future');
    }

    // Validate locations have valid visit times
    for (const location of createDateDto.locations) {
      const visitTime = new Date(location.visitTime);
      if (visitTime < startDateTime) {
        throw new BadRequestException('Location visit times must be after the start date time');
      }
    }

    const date = new this.dateModel({
      ...createDateDto,
      ownerId,
      startDateTime,
      locations: createDateDto.locations.map(loc => ({
        ...loc,
        visitTime: new Date(loc.visitTime),
        imageUrls: loc.imageUrls || [],
      })),
    });

    const savedDate = await date.save();
    return this.formatDateResponse(savedDate);
  }

  async findAll(page: number = 1, limit: number = 10, excludeUserId?: string): Promise<{ dates: DateResponseDto[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    
    // Build query - exclude user's own dates if userId provided
    // Use $nin to exclude both ObjectId and string versions of the userId
    const excludeObjectId = excludeUserId ? new Types.ObjectId(excludeUserId) : null;
    const query = excludeUserId ? { 
      ownerId: { 
        $nin: [excludeUserId, excludeObjectId] 
      } 
    } : {};
    
    this.logger.log(`findAll - excludeUserId string: ${excludeUserId || 'undefined'}, page: ${page}, limit: ${limit}`);
    this.logger.log(`findAll - excludeObjectId: ${excludeObjectId ? excludeObjectId.toString() : 'null'}`);
    this.logger.log(`findAll - MongoDB query: ${JSON.stringify(query, (key, value) => {
      if (Array.isArray(value)) {
        return value.map(v => v instanceof Types.ObjectId ? v.toString() : v);
      }
      return value instanceof Types.ObjectId ? value.toString() : value;
    })}`);
    
    const [dates, total] = await Promise.all([
      this.dateModel
        .find(query)
        .populate('ownerId', 'fullname avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.dateModel.countDocuments(query).exec(),
    ]);

    // Log the ownerId of each date before processing
    dates.forEach((date, index) => {
      this.logger.log(`findAll - Date ${index + 1} ownerId: ${date.ownerId} (type: ${typeof date.ownerId})`);
    });

    const datesWithRequestCounts = await Promise.all(
      dates.map(async (date) => {
        const pendingCount = await this.joinRequestModel.countDocuments({
          dateId: date._id,
          status: 'pending',
        });
        return this.formatDateResponse(date, pendingCount);
      })
    );

    this.logger.log(`findAll - Found ${dates.length} dates, total: ${total}`);

    return {
      dates: datesWithRequestCounts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<DateResponseDto> {
    const date = await this.dateModel
      .findById(id)
      .populate('ownerId', 'fullname avatarUrl')
      .exec();

    if (!date) {
      throw new NotFoundException('Date not found');
    }

    const pendingCount = await this.joinRequestModel.countDocuments({
      dateId: date._id,
      status: 'pending',
    });

    return this.formatDateResponse(date, pendingCount);
  }

  async update(id: string, updateDateDto: UpdateDateDto, userId: string): Promise<DateResponseDto> {
    const date = await this.dateModel.findById(id).exec();
    
    if (!date) {
      throw new NotFoundException('Date not found');
    }

    if (date.ownerId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own dates');
    }

    // If updating startDateTime, validate it's in the future
    if (updateDateDto.startDateTime) {
      const startDateTime = new Date(updateDateDto.startDateTime);
      if (startDateTime <= new Date()) {
        throw new BadRequestException('Start date and time must be in the future');
      }
    }

    // If updating locations, validate visit times
    if (updateDateDto.locations) {
      const startDateTime = updateDateDto.startDateTime ? new Date(updateDateDto.startDateTime) : date.startDateTime;
      for (const location of updateDateDto.locations) {
        const visitTime = new Date(location.visitTime);
        if (visitTime < startDateTime) {
          throw new BadRequestException('Location visit times must be after the start date time');
        }
      }
    }

    const updatedDate = await this.dateModel
      .findByIdAndUpdate(
        id,
        {
          ...updateDateDto,
          ...(updateDateDto.startDateTime && { startDateTime: new Date(updateDateDto.startDateTime) }),
          ...(updateDateDto.locations && {
            locations: updateDateDto.locations.map(loc => ({
              ...loc,
              visitTime: new Date(loc.visitTime),
              imageUrls: loc.imageUrls || [],
            })),
          }),
        },
        { new: true }
      )
      .populate('ownerId', 'fullname avatarUrl')
      .exec();

    if (!updatedDate) {
      throw new NotFoundException('Date not found');
    }

    const pendingCount = await this.joinRequestModel.countDocuments({
      dateId: updatedDate._id,
      status: 'pending',
    });

    return this.formatDateResponse(updatedDate, pendingCount);
  }

  async remove(id: string, userId: string): Promise<void> {
    const date = await this.dateModel.findById(id).exec();
    
    if (!date) {
      throw new NotFoundException('Date not found');
    }

    if (date.ownerId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own dates');
    }

    // Delete all associated join requests
    await this.joinRequestModel.deleteMany({ dateId: date._id }).exec();
    
    // Delete the date
    await this.dateModel.findByIdAndDelete(id).exec();
  }

  async findUserDates(userId: string, page: number = 1, limit: number = 10): Promise<{ dates: DateResponseDto[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    
    const [dates, total] = await Promise.all([
      this.dateModel
        .find({ ownerId: userId })
        .populate('ownerId', 'fullname avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.dateModel.countDocuments({ ownerId: userId }).exec(),
    ]);

    const datesWithRequestCounts = await Promise.all(
      dates.map(async (date) => {
        const pendingCount = await this.joinRequestModel.countDocuments({
          dateId: date._id,
          status: 'pending',
        });
        return this.formatDateResponse(date, pendingCount);
      })
    );

    return {
      dates: datesWithRequestCounts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  private formatDateResponse(date: DateDocument, pendingRequestsCount: number = 0): DateResponseDto {
    const ownerAny: any = date.ownerId as any;
    const ownerId: string = ownerAny?._id ? ownerAny._id.toString() : (date.ownerId as any).toString();
    return {
      id: (date._id as any).toString(),
      owner: {
        id: ownerId,
        fullname: ownerAny?.fullname,
        avatarUrl: ownerAny?.avatarUrl,
      },
      startDateTime: date.startDateTime.toISOString(),
      greetingNote: date.greetingNote,
      locations: date.locations.map((loc: any) => ({
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        visitTime: (loc.visitTime as Date).toISOString(),
        imageUrls: Array.isArray(loc.imageUrls) ? loc.imageUrls : [],
      })),
      status: date.status,
      pendingRequestsCount,
      budgetAmount: date.budgetAmount,
      costSplitPercentage: date.costSplitPercentage,
      createdAt: (date.createdAt as Date).toISOString(),
      updatedAt: (date.updatedAt as Date).toISOString(),
    };
  }
}
