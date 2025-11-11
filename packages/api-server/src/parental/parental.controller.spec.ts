import { Test, TestingModule } from '@nestjs/testing';
import { ParentalController } from './parental.controller';
import { ParentalService } from './parental.service';

describe('ParentalController', () => {
  let controller: ParentalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParentalController],
      providers: [
        {
          provide: ParentalService,
          useValue: {
            linkAccount: jest.fn(),
            listPendingEventApprovals: jest.fn(),
            approveEventParticipation: jest.fn(),
            rejectEventParticipation: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ParentalController>(ParentalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
