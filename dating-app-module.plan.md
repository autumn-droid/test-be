<!-- 229362ae-41c3-4ea0-acc9-805005a7fc78 9a093c37-4238-46c0-b157-add7e95e2534 -->
# Add Budget and Cost Split Fields to Date API

## Overview

Extend the date creation API to include budget information and cost-sharing details.

## Changes Required

### 1. Update Date Schema

**File:** `src/dates/schemas/date.schema.ts`

Add two new fields:

```typescript
@Prop({ 
  type: {
    amount: { type: Number, required: true },
    currency: { type: String, required: true, enum: ['VND', 'USD', 'EUR', 'JPY'] }
  },
  required: true 
})
budgetAmount: {
  amount: number;
  currency: string;
};

@Prop({ 
  required: true, 
  min: 0, 
  max: 100 
})
costSplitPercentage: number;
```

### 2. Create Budget DTO

**File:** `src/dates/dto/budget.dto.ts`

```typescript
export class BudgetDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsIn(['VND', 'USD', 'EUR', 'JPY', 'GBP', 'CNY'])
  currency: string;
}
```

### 3. Update CreateDateDto

**File:** `src/dates/dto/create-date.dto.ts`

Add:

```typescript
@ApiProperty({ type: BudgetDto })
@ValidateNested()
@Type(() => BudgetDto)
budgetAmount: BudgetDto;

@ApiProperty({ minimum: 0, maximum: 100 })
@IsNumber()
@Min(0)
@Max(100)
costSplitPercentage: number;
```

### 4. Update DateResponseDto

**File:** `src/dates/dto/date-response.dto.ts`

Add:

```typescript
@ApiProperty()
budgetAmount: {
  amount: number;
  currency: string;
};

@ApiProperty({ minimum: 0, maximum: 100 })
costSplitPercentage: number;
```

### 5. Update Service Response Formatter

**File:** `src/dates/dates.service.ts`

In `formatDateResponse()`, add:

```typescript
budgetAmount: date.budgetAmount,
costSplitPercentage: date.costSplitPercentage,
```

### 6. Update UpdateDateDto

**File:** `src/dates/dto/update-date.dto.ts`

Already uses `PartialType`, so budget fields will automatically be optional in updates.

## Validation Rules

- `budgetAmount.amount` must be >= 0
- `budgetAmount.currency` must be one of: VND, USD, EUR, JPY, GBP, CNY
- `costSplitPercentage` must be 0-100
- Both fields required on create
- Both fields optional on update
- Both fields public in all responses

## Example API Usage

**Create Date:**

```json
{
  "startDateTime": "2025-10-23T19:00:00.000Z",
  "greetingNote": "Let's have dinner!",
  "budgetAmount": {
    "amount": 1500000,
    "currency": "VND"
  },
  "costSplitPercentage": 70,
  "locations": [...]
}
```

**Response:**

```json
{
  "id": "...",
  "owner": {...},
  "budgetAmount": {
    "amount": 1500000,
    "currency": "VND"
  },
  "costSplitPercentage": 70,
  ...
}
```

## Files to Modify

1. `src/dates/schemas/date.schema.ts`
2. `src/dates/dto/budget.dto.ts` (new)
3. `src/dates/dto/create-date.dto.ts`
4. `src/dates/dto/date-response.dto.ts`
5. `src/dates/dates.service.ts`

## Additional Enhancement: Optional Authentication on GET /dates

### 7. Create OptionalJwtGuard
**File:** `src/auth/guards/optional-jwt.guard.ts` (new)

Created a guard that allows optional JWT authentication - if token is provided and valid, user is authenticated; if not, request continues without error.

### 8. Update GET /dates Endpoint
**File:** `src/dates/dates.controller.ts`

- Added `@UseGuards(OptionalJwtGuard)` to make authentication optional
- Added `@ApiBearerAuth('JWT-auth')` for Swagger documentation
- Modified `findAll()` to extract userId from request if authenticated

**File:** `src/dates/dates.service.ts`

- Updated `findAll()` to accept optional `excludeUserId` parameter
- Added query filter to exclude user's own dates when authenticated
- Uses ObjectId comparison for proper MongoDB query

### Behavior:
- **Without token:** Returns all public dates (existing behavior maintained)
- **With valid token:** Returns all dates EXCEPT the authenticated user's own dates
- Users can still view their own dates via `/dates/my-dates`

### To-dos

- [x] Create BudgetDto with amount and currency validation
- [x] Add budgetAmount and costSplitPercentage to Date schema
- [x] Add required budget fields to CreateDateDto
- [x] Add budget fields to DateResponseDto
- [x] Include budget fields in formatDateResponse
- [x] Create OptionalJwtGuard for optional authentication
- [x] Update GET /dates to support optional authentication
- [x] Filter out authenticated user's own dates

## Status: ✅ COMPLETE

All implementations have been completed and tested successfully!
