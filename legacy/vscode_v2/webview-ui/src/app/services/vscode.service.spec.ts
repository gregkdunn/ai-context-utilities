import { TestBed } from '@angular/core/testing';
import { VscodeService } from './vscode.service';

describe('VscodeService', () => {
  let service: VscodeService;
  let mockVscodeApi: jest.MockedObject<any>;

  beforeEach(() => {
    // Mock the VSCode API
    mockVscodeApi = {
      postMessage: jest.fn(),
      getState: jest.fn(() => ({})),
      setState: jest.fn()
    };

    // Use Object.defineProperty to override the acquireVsCodeApi function
    Object.defineProperty(window, 'acquireVsCodeApi', {
      value: jest.fn(() => mockVscodeApi),
      writable: true,
      configurable: true
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(VscodeService);
  });

  afterEach(() => {
    // Clean up global mocks
    jest.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should post messages to VSCode', () => {
    const command = 'testCommand';
    const data = { test: 'data' };
    
    service.postMessage(command, data);
    
    expect(mockVscodeApi.postMessage).toHaveBeenCalledWith({ command, data });
  });

  it('should get state from VSCode', () => {
    const mockState = { test: 'state' };
    mockVscodeApi.getState.mockReturnValue(mockState);
    
    const result = service.getState();
    
    expect(result).toEqual(mockState);
    expect(mockVscodeApi.getState).toHaveBeenCalled();
  });

  it('should set state in VSCode', () => {
    const state = { test: 'state' };
    
    service.setState(state);
    
    expect(mockVscodeApi.setState).toHaveBeenCalledWith(state);
  });

  it('should handle missing VSCode API gracefully', () => {
    // Override acquireVsCodeApi to throw an error
    Object.defineProperty(window, 'acquireVsCodeApi', {
      value: () => { throw new Error('VSCode API not available'); },
      writable: true,
      configurable: true
    });
    
    // Create a new service instance
    const newService = new VscodeService();
    
    expect(() => {
      newService.postMessage('test', {});
    }).not.toThrow();
  });

  it('should setup message listener', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    
    // Create a new service to trigger the listener setup
    new VscodeService();
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
    
    addEventListenerSpy.mockRestore();
  });

  it('should emit messages when received', (done) => {
    const testMessage = { command: 'test', data: { test: 'data' } };
    
    service.onMessage().subscribe(message => {
      if (message) {
        expect(message).toEqual(testMessage);
        done();
      }
    });

    // Simulate receiving a message
    const messageEvent = new MessageEvent('message', {
      data: testMessage
    });
    window.dispatchEvent(messageEvent);
  });
});
