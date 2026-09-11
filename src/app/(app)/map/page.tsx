import MapCanvas from "@/components/map/MapCanvas";
import { getSpots, getSessions } from "@/infrastructure/repositories/user-data";
import { requireAccount } from "@/infrastructure/supabase/account";

export default async function MapPage() {
  const [{ profile }, spots, sessions] = await Promise.all([requireAccount(), getSpots(), getSessions()]);
  const sessionCounts = sessions.reduce<Record<string, number>>((counts, session) => {
    if (session.primarySpot) counts[session.primarySpot] = (counts[session.primarySpot] ?? 0) + 1;
    return counts;
  }, {});
  return <section className="map-page"><MapCanvas initialSpots={spots} location={profile.homeLocation} sessionCounts={sessionCounts} /></section>;
}
