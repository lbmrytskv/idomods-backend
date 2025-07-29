import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { BasicAuthGuard } from '../auth/basic-auth.guard';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { Response } from 'express';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  // Mock implementation of the OrdersService
  const mockOrdersService = {
    getOrderById: jest.fn(),
    getAllOrdersCsv: jest.fn(),
    fetchOrdersFromIdoSell: jest.fn(),
  };

  // Mock implementation of ConfigService (used by BasicAuthGuard, if needed)
  const mockConfigService = {
    get: jest.fn(() => 'test'),
  };

  // Create testing module before each test
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: ConfigService, useValue: mockConfigService },
        BasicAuthGuard, 
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  // Basic test to check if the controller is defined
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Test: returns order data when found
  it('should return order by id', async () => {
    const mockOrder = {
      orderID: 'abc123',
      products: [{ productID: 'p1', quantity: 2 }],
      orderWorth: 150,
    };

    // Mock service to return fake order
    mockOrdersService.getOrderById.mockResolvedValueOnce(mockOrder);

    const result = await controller.getOrderById('abc123');

    // Ensure service was called with correct param
    expect(service.getOrderById).toHaveBeenCalledWith('abc123');
    expect(result).toEqual(mockOrder);
  });

  // Test: throws 404 error when order not found
  it('should throw NotFoundException if order not found', async () => {
    mockOrdersService.getOrderById.mockImplementationOnce(() => {
      throw new NotFoundException('Order with ID missing not found');
    });

    await expect(controller.getOrderById('missing')).rejects.toThrow(
      new NotFoundException('Order with ID missing not found'),
    );
  });

  // Test: returns CSV content via Express response
  it('should return CSV data in response', async () => {
    const mockCsv = 'orderID,productID,quantity,orderWorth\n1,111,2,100\n';

    // Mock service to return CSV string
    mockOrdersService.getAllOrdersCsv.mockResolvedValueOnce(mockCsv);

    // Create a mocked Express response object
    const mockRes = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;

    // Call controller with undefined filters (will be parsed as undefined in service)
    await controller.getAllAsCsv(undefined as unknown as string, undefined as unknown as string, mockRes);

    // Assert correct behavior of controller and response
    expect(service.getAllOrdersCsv).toHaveBeenCalledWith(undefined, undefined);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="orders.csv"',
    );
    expect(mockRes.send).toHaveBeenCalledWith(mockCsv);
  });
});

