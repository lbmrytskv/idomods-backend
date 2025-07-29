import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Order } from './schemas/order.schema';
import { NotFoundException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;

  // Mocked Mongoose model with common methods used in the service
  const mockOrderModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    insertMany: jest.fn(),
  };

  // Mocked ConfigService that returns fake values for environment variables
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'IDOSELL_API_KEY') return 'fake-api-key';
      if (key === 'IDOSELL_API_URL') return 'https://fake-url.com';
    }),
  };

  // Set up the testing module before each test
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          // Provide the mocked Mongoose model
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
        {
          // Provide the mocked ConfigService
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    // Get the instance of the service from the testing module
    service = module.get<OrdersService>(OrdersService);
  });

  // Basic test to check if the service is properly defined
  it('service should be defined', () => {
    expect(service).toBeDefined();
  });

  // Test case: should return order by orderID
  it('should return order by orderID', async () => {
    const mockOrder = {
      orderID: 'test-123',
      products: [{ productID: '111', quantity: 2 }],
      orderWorth: 100,
    };

    // Mock the behavior of findOne().lean() to return the mockOrder
    mockOrderModel.findOne.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce(mockOrder),
    });

    // Call the service method
    const result = await service.getOrderById('test-123');

    // Expect the correct MongoDB query to be called
    expect(mockOrderModel.findOne).toHaveBeenCalledWith({ orderID: 'test-123' });

    // Expect the returned result to match the mock order
    expect(result).toEqual(mockOrder);
  });

  // Test case: should throw NotFoundException if the order is not found
  it('should throw NotFoundException if order not found', async () => {
    // Mock the behavior of findOne().lean() to return null
    mockOrderModel.findOne.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce(null),
    });

    // Expect the service method to throw a NotFoundException
    await expect(service.getOrderById('missing-id')).rejects.toThrow(
      new NotFoundException('Order with ID missing-id not found')
    );
  });
});
