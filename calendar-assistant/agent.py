import logging
import livekit.rtc
import asyncio

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RoomInputOptions,
    WorkerOptions,
    cli,
)
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from livekit.agents import AgentStateChangedEvent, MetricsCollectedEvent, metrics
import httpx
from livekit.agents import stt, llm, tts, inference
import json
import datetime
from calendar_tools import make_calendar_tools

logger = logging.getLogger(__name__)

class Assistant(Agent):
    def __init__(self, time_ctx: str, tools: list) -> None:
        super().__init__(
            instructions=(
                f"You are a friendly, helpful voice assistant for Google Calendar. "
                f"The current date and time is {time_ctx} (timezone: America/Los_Angeles). "
                "\n\n"
                "STRICT GUARDRAILS (SECURITY & SCOPE):\n"
                "1. You are strictly a Google Calendar Assistant.\n"
                "2. If the user asks you to write code, tell jokes, answer general knowledge questions, browse the web, or perform any task outside of managing a calendar, you MUST respectfully decline.\n"
                "3. Use this exact phrase or a close variant for off-topic requests: 'I can currently only perform CRUD operations on your calendar, but in the future, I will be capable of doing more. Let's get back to your schedule!'\n"
                "\n"
                "CALENDAR RULES — follow these exactly:\n"
                "\n"
                "## Creating events\n"
                "Before calling create_event, you MUST collect ALL of the following from the user in a natural conversation:\n"
                "  1. The User's Name (who is booking it?)\n"
                "  2. Preferred Date (e.g. 'March 5th' or 'tomorrow')\n"
                "  3. Preferred Start Time (e.g. '2pm')\n"
                "  4. Preferred End Time (e.g. '3pm') — if not given, explicitly ask for it. Do NOT assume a 1-hour duration.\n"
                "  5. Meeting Title (optional, but you should ask once if they have a preferred title. If they don't, gracefully make one up based on the context).\n"
                "Ask for missing fields naturally, one or two at a time. "
                "Once you have all the required details, repeat them back clearly and ask 'Should I go ahead and add that for you?' "
                "Only call create_event after the user confirms.\n"
                "Never guess, infer, or fill in the Date, Time, or User's Name on your own.\n"
                "\n"
                "## Deleting events\n"
                "Before calling delete_event, ALWAYS call get_upcoming_events first to find the right event. "
                "Read the event name back to the user and ask 'Should I delete that one?' before deleting.\n"
                "\n"
                "## Listing/Reading events\n"
                "When the user asks what's on their calendar, call get_upcoming_events and read the results "
                "back in a natural, conversational way. Do not make up events.\n"
                "\n"
                "## General tone\n"
                "Keep responses short, clear, and conversational — this is a voice assistant, not a text bot. "
                "If you are unsure about anything, ask the user rather than guessing."
            ),
            tools=tools,
        )


async def entrypoint(ctx: JobContext):
    # Initialize session without tools first
    session = AgentSession(
        stt=stt.FallbackAdapter([inference.STT.from_model_string("assemblyai/universal-streaming-multilingual"),
        inference.STT.from_model_string("deepgram/nova-3")]),
        llm=llm.FallbackAdapter([inference.LLM.from_model_string("openai/gpt-4o-mini"),
        inference.LLM.from_model_string("google/gemini-2.5-flash")]),
        tts=tts.FallbackAdapter([inference.TTS.from_model_string("elevenlabs/eleven_turbo_v2_5:cgSgspJ2msm6clMCkdW9"),
        inference.TTS.from_model_string("elevenlabs/eleven_turbo_v2_5:Xb7hH8MSUJpSbSDYk0k2")]), 
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

    usage_collector = metrics.UsageCollector()
    last_eou_metrics: metrics.EOUMetrics | None = None

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        nonlocal last_eou_metrics
        if ev.metrics.type == "eou_metrics":
            last_eou_metrics = ev.metrics
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info("Usage summary: %s", summary)

    ctx.add_shutdown_callback(log_usage)

    @session.on("agent_state_changed")
    def _on_agent_state_changed(ev: AgentStateChangedEvent):
        try:
            if (
                ev.new_state == "speaking"
                and last_eou_metrics
                and session.current_speech
                and last_eou_metrics.speech_id == session.current_speech.id
            ):
                # last_speaking_time may not exist in all SDK versions
                end_time = getattr(last_eou_metrics, "last_speaking_time",
                           getattr(last_eou_metrics, "end_of_utterance", None))
                if end_time:
                    delta = ev.created_at - end_time
                    logger.info("Time to first audio frame: %sms", delta.total_seconds() * 1000)
        except Exception:
            pass

    await ctx.connect()
    logger.info("Agent connected to room, waiting for Google Token...")

    shutdown_event = asyncio.Event()

    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(participant: livekit.rtc.RemoteParticipant):
        logger.info(f"Participant disconnected: {participant.identity}")
        shutdown_event.set()

    token_received = False
    
    @ctx.room.on("data_received")
    def on_data_received(data_packet: livekit.rtc.DataPacket):
        nonlocal token_received
        if token_received:
            return
            
        try:
            text = data_packet.data.decode("utf-8")
            payload = json.loads(text)
            message = payload.get("message", "")
            
            if message.startswith("GOOGLE_TOKEN:"):
                logger.info("Received Google Token via Data Channel")
                access_token = message.replace("GOOGLE_TOKEN:", "").strip()
                if not access_token:
                    logger.error("No access token provided.")
                    return

                time_ctx = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                calendar_tools = make_calendar_tools(access_token=access_token)
                
                token_received = True
                
                async def start_agent():
                    await session.start(
                        agent=Assistant(time_ctx=time_ctx, tools=calendar_tools),
                        room=ctx.room,
                        room_input_options=RoomInputOptions(
                            noise_cancellation=noise_cancellation.BVC(),
                        ),
                    )
                    
                    await session.say(
                        "Hello! I am connected to your Google Calendar. How can I help you schedule your day?",
                        allow_interruptions=False,
                    )
                
                import asyncio
                asyncio.create_task(start_agent())

        except Exception as e:
            logger.error(f"Failed to process data packet: {e}")
    
    # CRITICAL: Keep the entrypoint alive until the user disconnects or 10 minutes max
    try:
        await asyncio.wait_for(shutdown_event.wait(), timeout=600)  # 600s = 10m hard limit
        logger.info("User disconnected. Shutting down agent session.")
    except asyncio.TimeoutError:
        logger.info("Session hard limit (10m) reached. Shutting down to prevent runaway costs.")

if __name__ == "__main__":
    load_dotenv()
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, agent_name="calendar-assistant"))