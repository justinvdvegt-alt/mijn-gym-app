
const CLIENT_ID = '197251';
const CLIENT_SECRET = '1804f8f58f54354fddc9ee5e6180912e66d2f376';

/**
 * Belangrijk: De 'Authorization Callback Domain' in je Strava Dashboard 
 * moet exact overeenkomen met het domein waar deze app op draait (bijv. localhost of je preview URL).
 */
const getRedirectUri = () => {
  // Gebruik de huidige URL zonder query parameters
  const url = new URL(window.location.href);
  return url.origin + url.pathname;
};

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export const connectStrava = () => {
  const redirectUri = getRedirectUri();
  
  // Gebruik URLSearchParams voor veilige encoding van parameters
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto', // 'auto' voorkomt dat de gebruiker elke keer opnieuw moet goedkeuren
    scope: 'read,activity:read_all' // 'read' is vaak nodig als basis
  });

  const authUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;
  window.location.href = authUrl;
};

export const handleStravaCallback = async (code: string): Promise<StravaTokens> => {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Strava Token Exchange Error:', errorData);
    throw new Error('Failed to exchange Strava code');
  }

  const data = await response.json();
  
  const tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  };

  localStorage.setItem('strava_tokens', JSON.stringify(tokens));
  return tokens;
};

const getValidToken = async (): Promise<string | null> => {
  const stored = localStorage.getItem('strava_tokens');
  if (!stored) return null;

  let tokens: StravaTokens = JSON.parse(stored);
  const now = Math.floor(Date.now() / 1000);

  // Ververs token als deze binnen 5 minuten verloopt
  if (tokens.expires_at < now + 300) {
    try {
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
      };
      localStorage.setItem('strava_tokens', JSON.stringify(tokens));
    } catch (e) {
      console.error('Token refresh failed', e);
      return null;
    }
  }

  return tokens.access_token;
};

export const getLatestActivities = async () => {
  const token = await getValidToken();
  if (!token) return [];

  try {
    const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return [];
    const activities = await response.json();

    return activities
      .filter((a: any) => a.type === 'Run')
      .slice(0, 5)
      .map((a: any) => ({
        id: `strava-${a.id}`,
        type: 'run',
        distance: parseFloat((a.distance / 1000).toFixed(2)),
        duration: Math.round(a.moving_time / 60),
        date: a.start_date,
        source: 'strava',
        avgSpeed: parseFloat((a.average_speed * 3.6).toFixed(1))
      }));
  } catch (e) {
    console.error('Failed to fetch activities', e);
    return [];
  }
};
