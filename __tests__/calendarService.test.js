const calendarService = require('../services/calendarService');

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  lte: jest.fn(() => mockSupabase),
  in: jest.fn(() => mockSupabase),
  or: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve({ data: null, error: null }))
};

// Mock the Supabase instance
jest.mock('../config/database', () => ({
  supabase: mockSupabase
}));

describe('CalendarService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvent()', () => {
    test('should create event with required fields', async () => {
      const eventData = {
        title: 'Team Meeting',
        start_time: '2024-01-20T10:00:00Z',
        end_time: '2024-01-20T11:00:00Z',
        user_id: 'user-123'
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'event-123', ...eventData },
        error: null
      });

      const result = await calendarService.createEvent(eventData);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('event-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('calendar_events');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    test('should validate required fields', async () => {
      const result = await calendarService.createEvent({
        title: 'Meeting'
        // Missing start_time, end_time, user_id
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getEvents()', () => {
    test('should fetch events within date range', async () => {
      const mockEvents = [
        { id: '1', title: 'Meeting 1', start_time: '2024-01-20T10:00:00Z' },
        { id: '2', title: 'Meeting 2', start_time: '2024-01-20T14:00:00Z' }
      ];

      mockSupabase.eq.mockReturnThis();
      mockSupabase.gte.mockReturnThis();
      mockSupabase.lte.mockReturnThis();
      mockSupabase.order.mockResolvedValueOnce({
        data: mockEvents,
        error: null
      });

      const result = await calendarService.getEvents({
        user_id: 'user-123',
        start_date: '2024-01-20',
        end_date: '2024-01-21'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockSupabase.gte).toHaveBeenCalled();
      expect(mockSupabase.lte).toHaveBeenCalled();
    });

    test('should filter by event type', async () => {
      mockSupabase.eq.mockReturnThis();
      mockSupabase.gte.mockReturnThis();
      mockSupabase.lte.mockReturnThis();
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null
      });

      await calendarService.getEvents({
        user_id: 'user-123',
        start_date: '2024-01-20',
        end_date: '2024-01-21',
        type: 'meeting'
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith('type', 'meeting');
    });
  });

  describe('checkConflicts()', () => {
    test('should detect time conflicts', async () => {
      const conflictingEvent = {
        id: 'existing-event',
        title: 'Existing Meeting',
        start_time: '2024-01-20T10:30:00Z',
        end_time: '2024-01-20T11:30:00Z'
      };

      mockSupabase.eq.mockReturnThis();
      mockSupabase.or.mockResolvedValueOnce({
        data: [conflictingEvent],
        error: null
      });

      const result = await calendarService.checkConflicts(
        'user-123',
        '2024-01-20T10:00:00Z',
        '2024-01-20T11:00:00Z'
      );

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].id).toBe('existing-event');
    });

    test('should not report conflict when times do not overlap', async () => {
      mockSupabase.eq.mockReturnThis();
      mockSupabase.or.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await calendarService.checkConflicts(
        'user-123',
        '2024-01-20T14:00:00Z',
        '2024-01-20T15:00:00Z'
      );

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('updateEvent()', () => {
    test('should update event fields', async () => {
      const updates = {
        title: 'Updated Meeting',
        status: 'rescheduled'
      };

      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'event-123', ...updates },
        error: null
      });

      const result = await calendarService.updateEvent('event-123', updates);

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith(updates);
    });
  });

  describe('deleteEvent()', () => {
    test('should delete event by ID', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await calendarService.deleteEvent('event-123');

      expect(result.success).toBe(true);
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'event-123');
    });
  });

  describe('getUpcomingEvents()', () => {
    test('should fetch events for next 7 days', async () => {
      const upcomingEvents = [
        { id: '1', title: 'Tomorrow Meeting', start_time: '2024-01-21T10:00:00Z' }
      ];

      mockSupabase.eq.mockReturnThis();
      mockSupabase.gte.mockReturnThis();
      mockSupabase.lte.mockReturnThis();
      mockSupabase.in.mockReturnThis();
      mockSupabase.order.mockReturnThis();
      mockSupabase.limit.mockResolvedValueOnce({
        data: upcomingEvents,
        error: null
      });

      const result = await calendarService.getUpcomingEvents('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockSupabase.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getTodayEvents()', () => {
    test('should fetch events for current day', async () => {
      const todayEvents = [
        { id: '1', title: 'Today Meeting', start_time: '2024-01-20T14:00:00Z' }
      ];

      mockSupabase.eq.mockReturnThis();
      mockSupabase.gte.mockReturnThis();
      mockSupabase.lte.mockReturnThis();
      mockSupabase.order.mockResolvedValueOnce({
        data: todayEvents,
        error: null
      });

      const result = await calendarService.getTodayEvents('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });
});
