import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DateEntity, DateDocument } from './schemas/date.schema';
import { JoinRequest, JoinRequestDocument } from './schemas/join-request.schema';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { JoinRequestResponseDto } from './dto/join-request-response.dto';

@Injectable()
export class JoinRequestsService {
  constructor(
    @InjectModel(JoinRequest.name) private joinRequestModel: Model<JoinRequestDocument>,
    @InjectModel(DateEntity.name) private dateModel: Model<DateDocument>,
  ) {}

  async create(dateId: string, createJoinRequestDto: CreateJoinRequestDto, requesterId: string): Promise<JoinRequestResponseDto> {
    // Check if date exists
    const date = await this.dateModel.findById(dateId).exec();
    if (!date) {
      throw new NotFoundException('Date not found');
    }

    // Check if user is trying to request their own date
    if (date.ownerId.toString() === requesterId) {
      throw new ForbiddenException('You cannot send a join request to your own date');
    }

    // Check if date is still open
    if (date.status !== 'open') {
      throw new BadRequestException('This date is no longer accepting join requests');
    }

    // Check if user already has a pending or accepted request for this date
    const existingRequest = await this.joinRequestModel.findOne({
      dateId,
      requesterId,
      status: { $in: ['pending', 'accepted'] },
    }).exec();

    if (existingRequest) {
      throw new ConflictException('You already have a pending or accepted request for this date');
    }

    const joinRequest = new this.joinRequestModel({
      dateId,
      requesterId,
      message: createJoinRequestDto.message,
    });

    const savedRequest = await joinRequest.save();

    // Populate required refs before formatting the response
    const populated = await this.joinRequestModel
      .findById(savedRequest._id)
      .populate('requesterId', 'fullname avatarUrl')
      .populate('dateId', 'startDateTime greetingNote')
      .exec();

    if (!populated) {
      // Should not happen, but guard just in case
      return this.formatJoinRequestResponse(savedRequest);
    }

    return this.formatJoinRequestResponse(populated);
  }

  async findByDateId(dateId: string, ownerId: string): Promise<JoinRequestResponseDto[]> {
    // Verify the user is the owner of the date
    const date = await this.dateModel.findById(dateId).exec();
    if (!date) {
      throw new NotFoundException('Date not found');
    }

    if (date.ownerId.toString() !== ownerId) {
      throw new ForbiddenException('You can only view join requests for your own dates');
    }

    const requests = await this.joinRequestModel
      .find({ dateId })
      .populate('requesterId', 'fullname avatarUrl')
      .populate('dateId', 'startDateTime greetingNote')
      .sort({ createdAt: -1 })
      .exec();

    return requests.map(request => this.formatJoinRequestResponse(request));
  }

  async findByRequesterId(requesterId: string, page: number = 1, limit: number = 10): Promise<{ requests: JoinRequestResponseDto[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    
    const [requests, total] = await Promise.all([
      this.joinRequestModel
        .find({ requesterId })
        .populate('requesterId', 'fullname avatarUrl')
        .populate('dateId', 'startDateTime greetingNote')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.joinRequestModel.countDocuments({ requesterId }).exec(),
    ]);

    return {
      requests: requests.map(request => this.formatJoinRequestResponse(request)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async acceptRequest(dateId: string, requestId: string, ownerId: string): Promise<JoinRequestResponseDto> {
    // Verify the user is the owner of the date
    const date = await this.dateModel.findById(dateId).exec();
    if (!date) {
      throw new NotFoundException('Date not found');
    }

    if (date.ownerId.toString() !== ownerId) {
      throw new ForbiddenException('You can only accept requests for your own dates');
    }

    // Check if date is still open
    if (date.status !== 'open') {
      throw new BadRequestException('This date is no longer accepting join requests');
    }

    // Find the request
    const request = await this.joinRequestModel
      .findById(requestId)
      .populate('requesterId', 'fullname avatarUrl')
      .populate('dateId', 'startDateTime greetingNote')
      .exec();

    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    // Ensure comparison works whether dateId is populated document or ObjectId
    const requestDateId: string = (request.dateId as any)?._id
      ? (request.dateId as any)._id.toString()
      : (request.dateId as any).toString();
    if (requestDateId !== dateId) {
      throw new BadRequestException('Request does not belong to this date');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    // Reject any previously accepted request for this date
    await this.joinRequestModel.updateMany(
      { 
        dateId, 
        status: 'accepted',
        _id: { $ne: requestId }
      },
      { status: 'rejected' }
    ).exec();

    // Accept the current request
    request.status = 'accepted';
    await request.save();

    // Update the date status to matched and set acceptedRequestId
    await this.dateModel.findByIdAndUpdate(dateId, {
      status: 'matched',
      acceptedRequestId: request._id,
    }).exec();

    return this.formatJoinRequestResponse(request);
  }

  async rejectRequest(dateId: string, requestId: string, ownerId: string): Promise<JoinRequestResponseDto> {
    // Verify the user is the owner of the date
    const date = await this.dateModel.findById(dateId).exec();
    if (!date) {
      throw new NotFoundException('Date not found');
    }

    if (date.ownerId.toString() !== ownerId) {
      throw new ForbiddenException('You can only reject requests for your own dates');
    }

    // Find the request
    const request = await this.joinRequestModel
      .findById(requestId)
      .populate('requesterId', 'fullname avatarUrl')
      .populate('dateId', 'startDateTime greetingNote')
      .exec();

    if (!request) {
      throw new NotFoundException('Join request not found');
    }

    // Ensure comparison works whether dateId is populated document or ObjectId
    const requestDateId2: string = (request.dateId as any)?._id
      ? (request.dateId as any)._id.toString()
      : (request.dateId as any).toString();
    if (requestDateId2 !== dateId) {
      throw new BadRequestException('Request does not belong to this date');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    // Reject the request
    request.status = 'rejected';
    await request.save();

    return this.formatJoinRequestResponse(request);
  }

  private formatJoinRequestResponse(request: JoinRequestDocument): JoinRequestResponseDto {
    const dateAny: any = request.dateId as any;
    const requesterAny: any = request.requesterId as any;

    const dateId: string = dateAny?._id ? dateAny._id.toString() : (request.dateId as any).toString();
    const requesterId: string = requesterAny?._id ? requesterAny._id.toString() : (request.requesterId as any).toString();

    const startDateTimeIso: string | undefined = dateAny?.startDateTime
      ? new Date(dateAny.startDateTime).toISOString()
      : undefined;

    return {
      id: (request._id as any).toString(),
      date: {
        id: dateId,
        startDateTime: startDateTimeIso ?? new Date(0).toISOString(),
        greetingNote: dateAny?.greetingNote ?? '',
      },
      requester: {
        id: requesterId,
        fullname: requesterAny?.fullname,
        avatarUrl: requesterAny?.avatarUrl,
      },
      message: request.message,
      status: request.status,
      createdAt: (request.createdAt as Date).toISOString(),
      updatedAt: (request.updatedAt as Date).toISOString(),
    };
  }
}
