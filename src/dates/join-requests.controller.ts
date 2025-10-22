import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  UseGuards, 
  Request, 
  Query, 
  ParseIntPipe,
  DefaultValuePipe 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JoinRequestsService } from './join-requests.service';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { JoinRequestResponseDto } from './dto/join-request-response.dto';

@ApiTags('join-requests')
@Controller('dates')
export class JoinRequestsController {
  constructor(private readonly joinRequestsService: JoinRequestsService) {}

  @Post(':dateId/requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Send a join request to a date' })
  @ApiResponse({
    status: 201,
    description: 'Join request sent successfully',
    type: JoinRequestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid input data or date is closed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You cannot request your own date',
  })
  @ApiResponse({
    status: 404,
    description: 'Date not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - You already have a pending or accepted request for this date',
  })
  async create(
    @Param('dateId') dateId: string, 
    @Body() createJoinRequestDto: CreateJoinRequestDto, 
    @Request() req
  ): Promise<JoinRequestResponseDto> {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    return this.joinRequestsService.create(dateId, createJoinRequestDto, userId);
  }

  @Get(':dateId/requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all join requests for a date (owner only)' })
  @ApiResponse({
    status: 200,
    description: 'Join requests retrieved successfully',
    type: [JoinRequestResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only view requests for your own dates',
  })
  @ApiResponse({
    status: 404,
    description: 'Date not found',
  })
  async findByDateId(@Param('dateId') dateId: string, @Request() req): Promise<JoinRequestResponseDto[]> {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    return this.joinRequestsService.findByDateId(dateId, userId);
  }

  @Get('my-requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user\'s join requests' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'User\'s join requests retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        requests: { type: 'array', items: { $ref: '#/components/schemas/JoinRequestResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async findMyRequests(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    return this.joinRequestsService.findByRequesterId(userId, page, limit);
  }

  @Patch(':dateId/requests/:requestId/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Accept a join request (owner only, auto-rejects previous accepted request)' })
  @ApiResponse({
    status: 200,
    description: 'Join request accepted successfully',
    type: JoinRequestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Date is closed or request is not pending',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only accept requests for your own dates',
  })
  @ApiResponse({
    status: 404,
    description: 'Date or request not found',
  })
  async acceptRequest(
    @Param('dateId') dateId: string,
    @Param('requestId') requestId: string,
    @Request() req
  ): Promise<JoinRequestResponseDto> {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    return this.joinRequestsService.acceptRequest(dateId, requestId, userId);
  }

  @Patch(':dateId/requests/:requestId/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reject a join request (owner only)' })
  @ApiResponse({
    status: 200,
    description: 'Join request rejected successfully',
    type: JoinRequestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Request is not pending',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only reject requests for your own dates',
  })
  @ApiResponse({
    status: 404,
    description: 'Date or request not found',
  })
  async rejectRequest(
    @Param('dateId') dateId: string,
    @Param('requestId') requestId: string,
    @Request() req
  ): Promise<JoinRequestResponseDto> {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    return this.joinRequestsService.rejectRequest(dateId, requestId, userId);
  }
}
