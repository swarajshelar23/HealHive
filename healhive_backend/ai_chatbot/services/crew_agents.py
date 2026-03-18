import os
from django.conf import settings
from django.core.mail import send_mail

try:
    from crewai import Agent, Task, Crew
except Exception:
    Agent = None
    Task = None
    Crew = None

class CrewAIAssessmentAgents:
    def __init__(self):
        self.enabled = all([Agent, Task, Crew])
        # Use Anthropic model to match configured API key
        self.llm_model = os.getenv('CREWAI_MODEL', 'claude-3-5-sonnet-20241022')

    def build_agents(self):
        if not self.enabled:
            return None

        emotion_agent = Agent(
            role='Emotion Detection Agent',
            goal='Analyze user messages and identify dominant emotional signals.',
            backstory='A compassionate analyst trained to detect emotional cues without diagnosing.',
            verbose=False,
        )

        selector_agent = Agent(
            role='Test Selection Agent',
            goal='Select the most appropriate psychological assessment based on emotional cues.',
            backstory='An assessment coordinator that routes users to validated questionnaires.',
            verbose=False,
        )

        assessment_agent = Agent(
            role='Assessment Agent',
            goal='Administer psychological tests one question at a time in supportive language.',
            backstory='A calm conversational guide for safe, non-diagnostic assessment flow.',
            verbose=False,
        )

        report_agent = Agent(
            role='Report Generator Agent',
            goal='Generate a structured mental health report with score and severity.',
            backstory='A structured clinical-style summarizer for informational feedback.',
            verbose=False,
        )

        therapist_agent = Agent(
            role='Therapist Recommendation Agent',
            goal='Suggest practical therapy options and next steps based on score severity.',
            backstory='A care navigator that promotes safe escalation and support options.',
            verbose=False,
        )

        return {
            'emotion': emotion_agent,
            'selector': selector_agent,
            'assessment': assessment_agent,
            'report': report_agent,
            'therapist': therapist_agent,
        }

    def run_collaboration(self, user_message: str, selected_test: str, score: int, severity: str):
        agents = self.build_agents()
        if not agents:
            return {
                'emotional_observations': f'User narrative indicates signs aligned with {selected_test}.',
                'recommended_next_steps': 'Continue self-care, monitor symptoms, and consider talking to a licensed therapist if symptoms persist.',
                'suggested_therapy_options': 'Cognitive Behavioral Therapy (CBT), supportive counseling, mindfulness-based interventions.',
            }

        emotion_task = Task(
            description=f'Analyze emotional cues from message: {user_message}',
            expected_output='Short emotional cue summary',
            agent=agents['emotion'],
        )
        report_task = Task(
            description=f'Generate short report summary for {selected_test} with score {score} and severity {severity}',
            expected_output='Observations + next steps + therapy options',
            agent=agents['report'],
        )

        crew = Crew(
            agents=[agents['emotion'], agents['selector'], agents['assessment'], agents['report'], agents['therapist']],
            tasks=[emotion_task, report_task],
            verbose=False,
        )

        try:
            crew_output = str(crew.kickoff())
        except Exception:
            crew_output = ''

        return {
            'emotional_observations': crew_output[:350] or f'User narrative indicates signs aligned with {selected_test}.',
            'recommended_next_steps': 'Schedule a therapy session if distress is moderate/severe or persistent for two weeks.',
            'suggested_therapy_options': 'CBT, ACT, group therapy, and psychoeducation support plans.',
        }


class CrewAIEmailAgents:
    def __init__(self):
        self.enabled = all([Agent, Task, Crew])

    def _generate_email_body(self, role: str, prompt: str, fallback: str) -> str:
        if not self.enabled:
            return fallback

        try:
            email_agent = Agent(
                role=role,
                goal='Generate clear, empathetic, professional emails for mental health platform workflows.',
                backstory='A communication specialist for care-coordination messages.',
                verbose=False,
            )
            task = Task(
                description=prompt,
                expected_output='Plain-text email body without markdown.',
                agent=email_agent,
            )
            crew = Crew(agents=[email_agent], tasks=[task], verbose=False)
            result = str(crew.kickoff()).strip()
            return result or fallback
        except Exception:
            return fallback

    def send_therapist_assignment_email(self, report, therapy_request):
        if not report.user or not report.user.email:
            return

        therapist_name = (
            therapy_request.assigned_therapist.user.full_name
            if therapy_request.assigned_therapist and therapy_request.assigned_therapist.user
            else 'Assigned Therapist'
        )
        fallback = (
            f"Hello {report.user.full_name},\n\n"
            f"A therapist has been assigned to your HealHive case: {therapist_name}.\n"
            f"Screening severity: {report.severity or 'N/A'}\n"
            "Please log in to review next steps and schedule your session.\n\n"
            "HealHive Team"
        )
        prompt = (
            'Write a concise assignment email to a HealHive user. '
            f"Therapist name: {therapist_name}. Severity: {report.severity or 'N/A'}. "
            'Include next steps for booking the first session.'
        )
        message = self._generate_email_body('Therapist Assignment Email Agent', prompt, fallback)
        send_mail(
            subject='HealHive: Therapist Assigned to Your Care Request',
            message=message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
            recipient_list=[report.user.email],
            fail_silently=True,
        )

    def send_session_confirmation_email(self, session):
        therapist_name = session.therapist.user.full_name
        patient_name = session.patient.user.full_name
        meeting_link = session.meeting_link
        if meeting_link.startswith('/'):
            base_url = getattr(settings, 'APP_BASE_URL', '').rstrip('/')
            if base_url:
                meeting_link = f"{base_url}{meeting_link}"

        fallback = (
            f"Hello {patient_name},\n\n"
            "Your HealHive session is confirmed.\n"
            f"Therapist: {therapist_name}\n"
            f"Session Time: {session.session_time}\n"
            f"Video Link: {meeting_link}\n"
            f"Room ID: {session.room_id}\n\n"
            "Session Instructions:\n"
            "1) Join 5 minutes early\n"
            "2) Use a quiet space and stable internet\n"
            "3) Allow microphone/camera access in your browser\n\n"
            "HealHive Team"
        )
        prompt = (
            'Write a session confirmation email including therapist name, date/time, video link, room id, and session instructions. '
            f"Therapist: {therapist_name}; DateTime: {session.session_time}; VideoLink: {meeting_link}; Room ID: {session.room_id}."
        )
        message = self._generate_email_body('Session Confirmation Email Agent', prompt, fallback)

        recipients = [session.patient.user.email, session.therapist.user.email]
        for recipient in recipients:
            send_mail(
                subject='HealHive: Session Confirmation',
                message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
                recipient_list=[recipient],
                fail_silently=True,
            )

    def send_followup_email(self, session):
        patient = session.patient.user
        if not patient.email:
            return

        fallback = (
            f"Hello {patient.full_name},\n\n"
            "Thank you for attending your HealHive session.\n"
            "How are you feeling after your session today?\n"
            "We’d value your feedback to help improve your care experience.\n\n"
            "HealHive Team"
        )
        prompt = (
            'Write a warm follow-up email after a completed therapy session, '
            'asking how the user feels and requesting brief feedback.'
        )
        message = self._generate_email_body('Follow-up Email Agent', prompt, fallback)
        send_mail(
            subject='HealHive: How Are You Feeling After Your Session?',
            message=message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
            recipient_list=[patient.email],
            fail_silently=True,
        )
