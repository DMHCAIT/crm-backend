const logger = require('../utils/logger');
const { supabase } = require('../config/supabaseClient');

/**
 * Calendar Service
 * Manages meetings, appointments, and calendar events
 */
class CalendarService {
  /**
   * Create a new calendar event
   */
  async createEvent({ title, description, start_time, end_time, type, attendees = [], lead_id, user_id, location, reminder_minutes }) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          title,
          description,
          start_time,
          end_time,
          type: type || 'meeting',
          attendees,
          lead_id,
          user_id,
          location,
          reminder_minutes: reminder_minutes || 30,
          status: 'scheduled',
          created_at: new Date()
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Calendar event created', { eventId: data.id, title });
      return { success: true, data };
    } catch (error) {
      logger.error('Failed to create calendar event', { error: error.message });
      throw error;
    }
  }

  /**
   * Get events for a user within a date range
   */
  async getEvents({ user_id, start_date, end_date, type, status }) {
    try {
      let query = supabase
        .from('calendar_events')
        .select('*, leads(name, email), users(fullName, email)')
        .gte('start_time', start_date)
        .lte('start_time', end_date);

      if (user_id) {
        query = query.or(`user_id.eq.${user_id},attendees.cs.{${user_id}}`);
      }

      if (type) {
        query = query.eq('type', type);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('start_time', { ascending: true });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error('Failed to fetch calendar events', { error: error.message });
      throw error;
    }
  }

  /**
   * Update event status
   */
  async updateEventStatus(eventId, status) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .update({ status, updated_at: new Date() })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      logger.info('Event status updated', { eventId, status });
      return { success: true, data };
    } catch (error) {
      logger.error('Failed to update event status', { error: error.message });
      throw error;
    }
  }

  /**
   * Get upcoming events (next 7 days)
   */
  async getUpcomingEvents(user_id) {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return this.getEvents({
      user_id,
      start_date: now.toISOString(),
      end_date: nextWeek.toISOString(),
      status: 'scheduled'
    });
  }

  /**
   * Get events for today
   */
  async getTodayEvents(user_id) {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    return this.getEvents({
      user_id,
      start_date: startOfDay.toISOString(),
      end_date: endOfDay.toISOString()
    });
  }

  /**
   * Check for scheduling conflicts
   */
  async checkConflicts(user_id, start_time, end_time, exclude_event_id = null) {
    try {
      let query = supabase
        .from('calendar_events')
        .select('id, title, start_time, end_time')
        .eq('user_id', user_id)
        .eq('status', 'scheduled')
        .or(`start_time.lte.${end_time},end_time.gte.${start_time}`);

      if (exclude_event_id) {
        query = query.neq('id', exclude_event_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { 
        hasConflicts: data.length > 0, 
        conflicts: data 
      };
    } catch (error) {
      logger.error('Failed to check conflicts', { error: error.message });
      throw error;
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*, leads(name, email, phone), users(fullName, email)')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      logger.error('Failed to fetch event', { error: error.message });
      throw error;
    }
  }

  /**
   * Update an event
   */
  async updateEvent(eventId, updates) {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .update({ ...updates, updated_at: new Date() })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      logger.info('Event updated', { eventId });
      return { success: true, data };
    } catch (error) {
      logger.error('Failed to update event', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId) {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      logger.info('Event deleted', { eventId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete event', { error: error.message });
      throw error;
    }
  }
}

module.exports = new CalendarService();
