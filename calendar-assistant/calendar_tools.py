import logging
import datetime
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from livekit.agents import llm

logger = logging.getLogger("calendar_tools")

# User's local timezone offset – Pacific Standard Time
DEFAULT_TIMEZONE = "America/Los_Angeles"


def make_calendar_tools(access_token: str) -> list:
    """
    Returns a list of async livekit function_tool callables that operate on
    the Google Calendar API authenticated with `access_token`.
    All functions MUST be async because livekit-agents awaits every tool call.
    """
    creds = Credentials(token=access_token)
    service = build('calendar', 'v3', credentials=creds)

    @llm.function_tool(description="Get upcoming events from the user's primary Google Calendar.")
    async def get_upcoming_events(max_results: int = 5) -> str:
        """Fetch the next `max_results` events from the user's calendar."""
        logger.info(f"Getting upcoming {max_results} events")
        try:
            now = datetime.datetime.utcnow().isoformat() + 'Z'
            events_result = service.events().list(
                calendarId='primary', timeMin=now,
                maxResults=max_results, singleEvents=True,
                orderBy='startTime').execute()
            events = events_result.get('items', [])

            if not events:
                return "No upcoming events found."

            result_str = "Upcoming Events:\n"
            for event in events:
                start = event['start'].get('dateTime', event['start'].get('date'))
                summary = event.get('summary', 'No Title')
                result_str += f"- {summary} at {start} (ID: {event['id']})\n"

            return result_str
        except Exception as e:
            logger.error(f"Error fetching events: {e}")
            return f"Failed to retrieve events: {str(e)}"

    @llm.function_tool(
        description=(
            "Create a new event on the user's primary Google Calendar. "
            "start_time and end_time must be ISO 8601 strings like '2026-03-01T10:00:00' "
            "(no timezone suffix needed — the user's local timezone will be applied automatically). "
            "summary is the event title. description is optional."
        )
    )
    async def create_event(summary: str, start_time: str, end_time: str, description: str = "") -> str:
        """
        Create a new calendar event.
        start_time and end_time should be ISO 8601 strings, e.g. '2026-03-01T10:00:00'.
        The user's local timezone (America/Los_Angeles) is applied automatically.
        """
        logger.info(f"Creating event: {summary}")
        try:
            # Strip any trailing timezone info so we can attach the correct one cleanly
            def strip_tz(ts: str) -> str:
                for suffix in ['Z', '+00:00']:
                    if ts.endswith(suffix):
                        ts = ts[:-len(suffix)]
                # Also strip any ±HH:MM offset at the end
                import re
                ts = re.sub(r'[+-]\d{2}:\d{2}$', '', ts)
                return ts

            event_body = {
                'summary': summary,
                'description': description,
                'start': {
                    'dateTime': strip_tz(start_time),
                    'timeZone': DEFAULT_TIMEZONE,
                },
                'end': {
                    'dateTime': strip_tz(end_time),
                    'timeZone': DEFAULT_TIMEZONE,
                },
            }
            event = service.events().insert(calendarId='primary', body=event_body).execute()
            return f"Event '{summary}' created successfully. Link: {event.get('htmlLink')}"
        except Exception as e:
            logger.error(f"Error creating event: {e}")
            return f"Failed to create event: {str(e)}"

    @llm.function_tool(description="Delete an event from the user's primary Google Calendar by its event ID.")
    async def delete_event(event_id: str) -> str:
        """Delete a calendar event by its ID."""
        logger.info(f"Deleting event ID: {event_id}")
        try:
            service.events().delete(calendarId='primary', eventId=event_id).execute()
            return f"Event {event_id} deleted successfully."
        except Exception as e:
            logger.error(f"Error deleting event: {e}")
            return f"Failed to delete event: {str(e)}"

    return [get_upcoming_events, create_event, delete_event]
