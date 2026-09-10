import { demoSessions } from "@/data/demo";
import { SessionJournal } from "@/components/sessions/SessionJournal";
export default function SessionsPage() { return <SessionJournal sessions={demoSessions} />; }
