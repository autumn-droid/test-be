import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DateEntity, DateDocument } from './schemas/date.schema';
import { JoinRequest, JoinRequestDocument } from './schemas/join-request.schema';
import { CreateDateDto } from './dto/create-date.dto';
import { UpdateDateDto } from './dto/update-date.dto';
import { DateResponseDto } from './dto/date-response.dto';
import { NearbyDateResponseDto } from './dto/nearby-date-response.dto';

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

  async findAll(page: number = 1, limit: number = 10, excludeUserId?: string, dateIso?: string): Promise<{ dates: DateResponseDto[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    // Build query - exclude user's own dates if userId provided
    // Use $nin to exclude both ObjectId and string versions of the userId
    const excludeObjectId = excludeUserId ? new Types.ObjectId(excludeUserId) : null;

    let dateFilter: any = {};
    if (dateIso) {
      const dt = new Date(dateIso);
      if (isNaN(dt.getTime())) {
        throw new BadRequestException('Invalid date. Use full ISO datetime.');
      }
      const dayStart = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0, 0));
      const dayEnd = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() + 1, 0, 0, 0, 0));
      this.logger.log(`findAll - dateIso: ${dateIso}, dayStart(UTC): ${dayStart.toISOString()}, dayEnd(UTC): ${dayEnd.toISOString()}`);
      dateFilter = { startDateTime: { $gte: dayStart, $lt: dayEnd } };
    }

    const query = {
      ...(excludeUserId ? { ownerId: { $nin: [excludeUserId, excludeObjectId] } } : {}),
      ...dateFilter,
    } as any;
    
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

  async getCountsByDates(datesIso: string[], excludeUserId?: string): Promise<{ results: { date: string; count: number }[] }> {
    if (!Array.isArray(datesIso) || datesIso.length === 0) {
      throw new BadRequestException('dates must be a non-empty array');
    }

    const parsed = datesIso.map(d => {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) throw new BadRequestException(`Invalid ISO datetime: ${d}`);
      return dt;
    });

    const dayKeys = parsed.map(dt => `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`);

    const minStart = new Date(Math.min(...parsed.map(dt => Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()))));
    const maxEnd = new Date(Math.max(...parsed.map(dt => Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()+1))));

    this.logger.log(`getCountsByDates - input dates: ${datesIso.join(', ')}`);
    this.logger.log(`getCountsByDates - computed day keys: ${dayKeys.join(', ')}`);
    this.logger.log(`getCountsByDates - window UTC: ${minStart.toISOString()} -> ${maxEnd.toISOString()}`);

    const match: any = { startDateTime: { $gte: minStart, $lt: maxEnd } };
    if (excludeUserId) {
      match.ownerId = { $nin: [excludeUserId, new Types.ObjectId(excludeUserId)] };
    }

    this.logger.log(`getCountsByDates - MongoDB match query: ${JSON.stringify(match)}`);

    const agg = await this.dateModel.aggregate([
      { $match: match },
      { $group: {
          _id: { $dateToString: { date: '$startDateTime', format: '%Y-%m-%d', timezone: 'UTC' } },
          count: { $sum: 1 }
        }
      },
    ]).exec();

    this.logger.log(`getCountsByDates - aggregation results: ${JSON.stringify(agg)}`);

    const countByDay = new Map<string, number>(agg.map((r: any) => [r._id as string, r.count as number]));

    const results = datesIso.map((orig, i) => ({ date: orig, count: countByDay.get(dayKeys[i]) ?? 0 }));
    this.logger.log(`getCountsByDates - computed counts for ${results.length} inputs: ${JSON.stringify(results)}`);

    return { results };
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

  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    excludeUserId?: string,
    dateIso?: string,
  ): Promise<NearbyDateResponseDto[]> {
    const excludeObjectId = excludeUserId ? new Types.ObjectId(excludeUserId) : null;

    let dateFilter: any = {};
    if (dateIso) {
      const dt = new Date(dateIso);
      if (isNaN(dt.getTime())) {
        throw new BadRequestException('Invalid date. Use full ISO datetime.');
      }
      const dayStart = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0, 0));
      const dayEnd = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() + 1, 0, 0, 0, 0));
      dateFilter = { startDateTime: { $gte: dayStart, $lt: dayEnd } };
    }

    const query: any = {
      'locations.0': { $exists: true },
      ...(excludeUserId ? { ownerId: { $nin: [excludeUserId, excludeObjectId] } } : {}),
      ...dateFilter,
    };

    const dates = await this.dateModel
      .find(query)
      .populate('ownerId', 'fullname avatarUrl')
      .exec();

    const results: NearbyDateResponseDto[] = [];

    for (const date of dates) {
      const minDistanceKm = Math.min(
        ...date.locations.map((loc: any) =>
          this.haversineKm(latitude, longitude, loc.latitude, loc.longitude),
        ),
      );

      if (minDistanceKm <= radiusKm) {
        const pendingCount = await this.joinRequestModel.countDocuments({
          dateId: date._id,
          status: 'pending',
        });
        results.push({
          ...this.formatDateResponse(date, pendingCount),
          distanceKm: Math.round(minDistanceKm * 100) / 100,
        });
      }
    }

    results.sort((a, b) => a.distanceKm - b.distanceKm);

    return results;
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
