import { TestBed } from '@angular/core/testing';

import { BasicRestService } from './basic-rest.service';

describe('TestServiceService', () => {
  let service: BasicRestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BasicRestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
