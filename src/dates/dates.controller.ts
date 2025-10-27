import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request, 
  Query, 
  ParseIntPipe,
  DefaultValuePipe,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import { DatesService } from './dates.service';
import { CreateDateDto } from './dto/create-date.dto';
import { UpdateDateDto } from './dto/update-date.dto';
import { DateResponseDto } from './dto/date-response.dto';
import { JoinRequestsService } from './join-requests.service';

@ApiTags('dates')
@Controller('dates')
export class DatesController {
  private readonly logger = new Logger(DatesController.name);

  constructor(
    private readonly datesService: DatesService,
    private readonly joinRequestsService: JoinRequestsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new date' })
  @ApiResponse({
    status: 201,
    description: 'Date created successfully',
    type: DateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async create(@Body() createDateDto: CreateDateDto, @Request() req): Promise<DateResponseDto> {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    return this.datesService.create(createDateDto, userId);
  }

  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Get all public dates with pagination (excludes authenticated user\'s dates if token provided)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'List of dates retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        dates: { type: 'array', items: { $ref: '#/components/schemas/DateResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async findAll(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    // Log request details
    this.logger.log(`GET /dates - Request received - has user: ${!!req.user}`);
    
    if (req.user) {
      this.logger.log(`GET /dates - User object: ${JSON.stringify(req.user)}`);
    }
    
    // Extract userId if authenticated, otherwise undefined
    const userId = req.user ? (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString() : undefined;
    
    this.logger.log(`GET /dates - Extracted userId: ${userId || 'undefined (no authentication)'}`);
    
    const result = await this.datesService.findAll(page, limit, userId);
    
    this.logger.log(`GET /dates - Returning ${result.dates.length} dates (total: ${result.total})`);
    
    return result;
  }

  @Get('my-requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Get current user's join requests" })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({
    status: 200,
    description: "User's join requests retrieved successfully",
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
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async findMyRequests(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    return this.joinRequestsService.findByRequesterId(userId, page, limit);
  }

  @Get('my-dates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user\'s dates' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'User\'s dates retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        dates: { type: 'array', items: { $ref: '#/components/schemas/DateResponseDto' } },
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
  async findMyDates(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    return this.datesService.findUserDates(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single date by ID' })
  @ApiResponse({
    status: 200,
    description: 'Date retrieved successfully',
    type: DateResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Date not found',
  })
  async findOne(@Param('id') id: string): Promise<DateResponseDto> {
    return this.datesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a date (owner only)' })
  @ApiResponse({
    status: 200,
    description: 'Date updated successfully',
    type: DateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only update your own dates',
  })
  @ApiResponse({
    status: 404,
    description: 'Date not found',
  })
  async update(
    @Param('id') id: string, 
    @Body() updateDateDto: UpdateDateDto, 
    @Request() req
  ): Promise<DateResponseDto> {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    return this.datesService.update(id, updateDateDto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a date (owner only)' })
  @ApiResponse({
    status: 200,
    description: 'Date deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only delete your own dates',
  })
  @ApiResponse({
    status: 404,
    description: 'Date not found',
  })
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    return this.datesService.remove(id, userId);
  }
}
