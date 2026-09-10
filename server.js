import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import webPush from 'web-push';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const required = ['DATABASE_URL', 'SESSION_SECRET'];
for (const name of required) if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(await import('node:fs/promises').then(fs => fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8')));

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '256kb' }));

const PgStore = connectPgSimple(session);
app.use(session({
  store: new PgStore({ pool, createTableIfMissing: true }),
  name: 'qubi.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 365 }
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try { done(null, (await pool.query('SELECT id,email,display_name,preferred_name,language,reminder_sound,avatar_url FROM users WHERE id=$1', [id])).rows[0] || false); }
  catch (error) { done(error); }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.APP_ORIGIN}/auth/google/callback`,
    state: true
  }, async (_access, _refresh, profile, done) => {
    try {
      const emailEntry = profile.emails?.find(item => item.verified) || profile.emails?.[0];
      if (!emailEntry?.value) return done(null, false);
      const email = emailEntry.value.toLowerCase();
      const googleAvatar = profile.photos?.[0]?.value && /^https:\/\//i.test(profile.photos[0].value) ? profile.photos[0].value : null;
      const result = await pool.query(`
        INSERT INTO users(email,display_name,google_id,avatar_url)
        VALUES($1,$2,$3,$4)
        ON CONFLICT(email) DO UPDATE SET
          google_id=COALESCE(users.google_id,EXCLUDED.google_id),
          avatar_url=COALESCE(EXCLUDED.avatar_url,users.avatar_url)
        RETURNING id,email,display_name,preferred_name,language,reminder_sound,avatar_url`,
        [email, profile.displayName || email.split('@')[0], profile.id, googleAvatar]);
      done(null, result.rows[0]);
    } catch (error) { done(error); }
  }));
}

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
const publicUser = user => ({ id: user.id, email: user.email, displayName: user.display_name, preferredName: user.preferred_name, language: user.language || 'hu', reminderSound:user.reminder_sound||'gentle', avatarUrl: user.avatar_url });
const mailer = process.env.SMTP_HOST ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 25), secure: process.env.SMTP_SECURE === 'true', auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined }) : null;
const pushEnabled=Boolean(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY);
if(pushEnabled)webPush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:admin@qubi.vane.hu',process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
const requireAuth = (req, res, next) => req.isAuthenticated() ? next() : res.status(401).json({ error: 'Bejelentkezés szükséges.' });

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/auth/me', (req, res) => res.json({ user: req.user ? publicUser(req.user) : null, googleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID) }));
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const displayName = String(req.body.displayName || '').trim();
  const password = String(req.body.password || '');
  if (!/^\S+@\S+\.\S+$/.test(email) || displayName.length < 2 || password.length < 8) return res.status(400).json({ error: 'Adj meg érvényes nevet, email-címet és legalább 8 karakteres jelszót.' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const user = (await pool.query('INSERT INTO users(email,display_name,preferred_name,password_hash) VALUES($1,$2,$2,$3) RETURNING id,email,display_name,preferred_name,language,reminder_sound,avatar_url', [email, displayName, hash])).rows[0];
    req.login(user, error => error ? res.status(500).json({ error: 'A belépés nem sikerült.' }) : res.status(201).json({ user: publicUser(user) }));
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ehhez az email-címhez már tartozik fiók.' });
    throw error;
  }
});
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = (await pool.query('SELECT * FROM users WHERE email=$1', [email])).rows[0];
  if (!user?.password_hash || !await bcrypt.compare(String(req.body.password || ''), user.password_hash)) return res.status(401).json({ error: 'Hibás email-cím vagy jelszó.' });
  req.login(user, error => error ? res.status(500).json({ error: 'A belépés nem sikerült.' }) : res.json({ user: publicUser(user) }));
});
app.post('/api/auth/logout', requireAuth, (req, res, next) => req.logout(error => error ? next(error) : req.session.destroy(() => res.clearCookie('qubi.sid').status(204).end())));
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = (await pool.query('SELECT id,email,language FROM users WHERE email=$1', [email])).rows[0];
  if (user && mailer) try {
    const token = crypto.randomBytes(32).toString('base64url'), hash = crypto.createHash('sha256').update(token).digest('hex');
    await pool.query('UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL', [user.id]);
    await pool.query("INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 minutes')", [user.id, hash]);
    const link = `${process.env.APP_ORIGIN}/?reset=${encodeURIComponent(token)}`;
    await mailer.sendMail({ from: process.env.MAIL_FROM || 'Qubi <noreply@qubi.vane.hu>', to: user.email, subject: 'Qubi – új jelszó beállítása', text: `A jelszavad itt állíthatod vissza 30 percen belül: ${link}`, html: `<p>A jelszavad az alábbi gombbal állíthatod vissza 30 percen belül.</p><p><a href="${link}">Új jelszó beállítása</a></p><p>Ha nem te kérted, hagyd figyelmen kívül ezt a levelet.</p>` });
  } catch (error) { console.error('Password reset email failed:', error.message); }
  res.json({ ok: true, message: 'Ha létezik ilyen fiók, elküldtük a visszaállító linket.' });
});
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  const token = String(req.body.token || ''), password = String(req.body.password || '');
  if (password.length < 8) return res.status(400).json({ error: 'A jelszó legalább 8 karakter legyen.' });
  const hash = crypto.createHash('sha256').update(token).digest('hex'), client = await pool.connect();
  try { await client.query('BEGIN'); const row = (await client.query("SELECT id,user_id FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE", [hash])).rows[0]; if (!row) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'A link érvénytelen vagy lejárt.' }); } const passwordHash = await bcrypt.hash(password, 12); await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [passwordHash, row.user_id]); await client.query('UPDATE password_reset_tokens SET used_at=now() WHERE id=$1', [row.id]); await client.query('DELETE FROM session WHERE sess->>\'passport\' LIKE $1', [`%${row.user_id}%`]).catch(()=>{}); await client.query('COMMIT'); res.json({ ok: true }); } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
});
app.put('/api/profile', requireAuth, async (req, res) => {
  const displayName=String(req.body.displayName||'').trim(),preferredName=String(req.body.preferredName||'').trim(),language=String(req.body.language||'hu'),reminderSound=String(req.body.reminderSound||'gentle');
  if(displayName.length<2||displayName.length>60||preferredName.length>40||!['hu','en','uk'].includes(language)||!['default','gentle','bright','custom'].includes(reminderSound))return res.status(400).json({error:'Érvénytelen profiladatok.'});
  const updated=(await pool.query('UPDATE users SET display_name=$1,preferred_name=$2,language=$3,reminder_sound=$4 WHERE id=$5 RETURNING id,email,display_name,preferred_name,language,reminder_sound,avatar_url',[displayName,preferredName||null,language,reminderSound,req.user.id])).rows[0];res.json({user:publicUser(updated)});
});
app.put('/api/profile/sound',requireAuth,express.raw({type:['audio/mpeg','audio/wav','audio/ogg','audio/mp4','audio/webm'],limit:'1mb'}),async(req,res)=>{if(!Buffer.isBuffer(req.body)||!req.body.length)return res.status(400).json({error:'Érvénytelen vagy üres hangfájl.'});await pool.query('UPDATE users SET reminder_sound=$1,sound_mime=$2,sound_data=$3 WHERE id=$4',['custom',req.get('content-type'),req.body,req.user.id]);res.json({ok:true})});
app.get('/api/profile/sound',requireAuth,async(req,res)=>{const row=(await pool.query('SELECT sound_mime,sound_data FROM users WHERE id=$1',[req.user.id])).rows[0];if(!row?.sound_data)return res.sendStatus(404);res.type(row.sound_mime).set('Cache-Control','private, max-age=3600').send(row.sound_data)});
app.get('/api/push/key', requireAuth, (_req,res)=>res.json({publicKey:pushEnabled?process.env.VAPID_PUBLIC_KEY:null}));
app.post('/api/push/subscribe', requireAuth, async(req,res)=>{const subscription=req.body;if(!subscription?.endpoint||!subscription?.keys?.p256dh||!subscription?.keys?.auth)return res.status(400).json({error:'Érvénytelen értesítési feliratkozás.'});await pool.query('INSERT INTO push_subscriptions(endpoint,user_id,subscription) VALUES($1,$2,$3) ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,subscription=EXCLUDED.subscription',[subscription.endpoint,req.user.id,subscription]);res.status(201).json({ok:true})});

function utcKey(date){return date.toISOString().slice(0,10)}
function reminderOccurs(task,key){const start=utcKey(new Date(task.due_at)),rule=task.recurrence;if(key<start||(rule?.endDate&&key>rule.endDate))return false;if(!rule)return key===start;const date=new Date(`${key}T12:00:00Z`),origin=new Date(`${start}T12:00:00Z`);if(rule.frequency==='daily')return true;if(rule.frequency==='weekly')return (rule.weekdays||[]).includes(date.getUTCDay());if(rule.frequency==='monthly')return date.getUTCDate()===Number(rule.monthDay||origin.getUTCDate());if(rule.frequency==='yearly')return date.getUTCMonth()===origin.getUTCMonth()&&date.getUTCDate()===origin.getUTCDate();return false}
async function deliverReminders(){if(!pushEnabled)return;const now=new Date(),key=utcKey(now),result=await pool.query(`SELECT t.*,COALESCE(json_agg(ps.subscription) FILTER (WHERE ps.endpoint IS NOT NULL),'[]') subscriptions FROM tasks t LEFT JOIN push_subscriptions ps ON ps.user_id=t.user_id WHERE t.deleted=false AND t.done=false AND t.reminder_minutes IS NOT NULL GROUP BY t.id`);for(const task of result.rows){if(!reminderOccurs(task,key)||(task.completed_dates||[]).includes(key))continue;const due=new Date(task.due_at);due.setUTCFullYear(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());const reminderAt=due.getTime()-task.reminder_minutes*60000;if(reminderAt>Date.now()||reminderAt<Date.now()-60000)continue;const claimed=await pool.query('INSERT INTO reminder_deliveries(task_id,occurrence_date) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING task_id',[task.id,key]);if(!claimed.rowCount)continue;const payload=JSON.stringify({title:'Qubi emlékeztető',body:task.title,url:'/',tag:`qubi-${task.id}-${key}`});for(const subscription of task.subscriptions)try{await webPush.sendNotification(subscription,payload,{TTL:3600,urgency:'high'})}catch(error){if([404,410].includes(error.statusCode))await pool.query('DELETE FROM push_subscriptions WHERE endpoint=$1',[subscription.endpoint]);else console.error('Push failed:',error.message)}}}
setInterval(()=>deliverReminders().catch(error=>console.error('Reminder worker failed:',error.message)),30000);
app.get('/auth/google', (req, res, next) => process.env.GOOGLE_CLIENT_ID ? passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next) : res.redirect('/?auth=google-unavailable'));
app.get('/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) {
      console.error('Google Auth Error:', err);
      return res.redirect('/?auth=failed');
    }
    if (!user) {
      console.error('Google Auth Failed Info:', info);
      return res.redirect('/?auth=failed');
    }
    req.login(user, loginErr => {
      if (loginErr) {
        console.error('Google Login Session Error:', loginErr);
        return res.redirect('/?auth=failed');
      }
      return res.redirect('/');
    });
  })(req, res, next);
});

app.post('/api/sync', requireAuth, async (req, res) => {
  const changes = Array.isArray(req.body.changes) ? req.body.changes.slice(0, 500) : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const task of changes) {
      if (!crypto.randomUUID || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(task.id)) continue;
      const title = String(task.title || '').trim().slice(0, 120);
      if (!title || !['Tanulás','Otthon','Munka','Saját'].includes(task.category)) continue;
      const changedAt = new Date(task.updatedAt);
      if (!Number.isFinite(changedAt.getTime()) || Math.abs(Date.now() - changedAt.getTime()) > 1000 * 60 * 60 * 24 * 365) continue;
      const recurrence = task.recurrence && ['daily','weekly','monthly','yearly'].includes(task.recurrence.frequency) ? task.recurrence : null;
      const completedDates = Array.isArray(task.completedDates) ? task.completedDates.filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value)).slice(-1000) : [];
      const image = typeof task.image === 'string' && task.image.startsWith('data:image/') && task.image.length < 750000 ? task.image : null;
      const description = typeof task.description === 'string' ? task.description.trim().slice(0, 1000) : null;
      await client.query(`INSERT INTO tasks(id,user_id,title,category,due_at,reminder_at,reminder_minutes,recurrence,completed_dates,done,deleted,image,description,client_updated_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,category=EXCLUDED.category,due_at=EXCLUDED.due_at,
          reminder_at=EXCLUDED.reminder_at,reminder_minutes=EXCLUDED.reminder_minutes,recurrence=EXCLUDED.recurrence,
          completed_dates=EXCLUDED.completed_dates,done=EXCLUDED.done,deleted=EXCLUDED.deleted,image=EXCLUDED.image,description=EXCLUDED.description,
          client_updated_at=EXCLUDED.client_updated_at,server_updated_at=now()
        WHERE tasks.user_id=EXCLUDED.user_id AND tasks.client_updated_at <= EXCLUDED.client_updated_at`,
        [task.id, req.user.id, title, task.category, task.dueAt || null, task.reminderAt || null, Number.isInteger(task.reminderMinutes) ? task.reminderMinutes : null, recurrence, JSON.stringify(completedDates), Boolean(task.done), Boolean(task.deleted), image, description, changedAt]);
    }
    await client.query('COMMIT');
    const rows = (await pool.query(`SELECT id,title,category,due_at AS "dueAt",reminder_at AS "reminderAt",reminder_minutes AS "reminderMinutes",recurrence,completed_dates AS "completedDates",done,deleted,image,description,
      client_updated_at AS "updatedAt" FROM tasks WHERE user_id=$1 ORDER BY server_updated_at`, [req.user.id])).rows;
    res.json({ tasks: rows, syncedAt: new Date().toISOString() });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
});

// Friends & Chat Endpoints
app.post('/api/friends/invite', requireAuth, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email || !/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Adj meg egy érvényes email-címet.' });
  if (email === req.user.email.toLowerCase()) return res.status(400).json({ error: 'Magadnak nem küldhetsz barátkérelmet.' });

  const targetUser = (await pool.query('SELECT id, display_name, email FROM users WHERE LOWER(email)=$1', [email])).rows[0];

  if (!targetUser) {
    await pool.query('INSERT INTO invitations(inviter_id, email) VALUES($1, $2)', [req.user.id, email]);
    const fromAddress = process.env.MAIL_FROM || process.env.SMTP_FROM || 'Qubi <noreply@prstart.hu>';
    if (mailer) {
      try {
        await mailer.sendMail({
          from: fromAddress,
          to: email,
          subject: `${req.user.display_name} meghívott a Qubi-ba!`,
          html: `<p>Szia!</p><p><strong>${req.user.display_name}</strong> meghívott a Qubi játékos feladatkezelőbe!</p><p><a href="${process.env.APP_ORIGIN || 'https://qubi.vane.hu'}">Kattints ide a regisztrációhoz</a> és csatlakozz!</p>`
        });
      } catch (e) { console.error('Invite email send error:', e); }
    }
    return res.json({ status: 'invited', message: `Meghívót küldtünk a megadott e-mail címre (${email}). Amint regisztrál, csatlakozhattok!` });
  }

  // Target user exists -> create or update friendship request
  const existing = (await pool.query('SELECT * FROM friendships WHERE (requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)', [req.user.id, targetUser.id])).rows[0];
  if (existing) {
    if (existing.status === 'accepted') return res.status(400).json({ error: `${targetUser.display_name} már a barátod!` });
    if (existing.status === 'pending') return res.status(400).json({ error: 'Már van folyamatban lévő barátkérelem köztetek.' });
    await pool.query('UPDATE friendships SET requester_id=$1, addressee_id=$2, status=$3, updated_at=now() WHERE id=$4', [req.user.id, targetUser.id, 'pending', existing.id]);
  } else {
    await pool.query('INSERT INTO friendships(requester_id, addressee_id, status) VALUES($1, $2, $3)', [req.user.id, targetUser.id, 'pending']);
  }

  res.json({ status: 'requested', message: `Barátkérelmet küldtünk ${targetUser.display_name} felhasználónak!` });
});

app.get('/api/friends', requireAuth, async (req, res) => {
  const friends = (await pool.query(`
    SELECT f.id AS friendship_id, f.status, f.requester_id, f.addressee_id,
      u.id AS user_id, u.display_name, u.email, u.avatar_url
    FROM friendships f
    JOIN users u ON (CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END) = u.id
    WHERE f.requester_id = $1 OR f.addressee_id = $1
    ORDER BY f.updated_at DESC
  `, [req.user.id])).rows;
  res.json({ friends });
});

app.post('/api/friends/respond', requireAuth, async (req, res) => {
  const { friendshipId, action } = req.body;
  if (!['accept', 'reject'].includes(action)) return res.status(400).json({ error: 'Érvénytelen művelet.' });
  const status = action === 'accept' ? 'accepted' : 'rejected';
  const result = await pool.query('UPDATE friendships SET status=$1, updated_at=now() WHERE id=$2 AND addressee_id=$3 RETURNING *', [status, friendshipId, req.user.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Kérelem nem található.' });
  res.json({ success: true, status });
});

app.get('/api/friends/messages/:friendId', requireAuth, async (req, res) => {
  const friendId = req.params.friendId;
  const messages = (await pool.query(`
    SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at
    FROM messages m
    WHERE (m.sender_id=$1 AND m.receiver_id=$2) OR (m.sender_id=$2 AND m.receiver_id=$1)
    ORDER BY m.created_at ASC LIMIT 200
  `, [req.user.id, friendId])).rows;
  res.json({ messages });
});

app.post('/api/friends/messages/:friendId', requireAuth, async (req, res) => {
  const friendId = req.params.friendId;
  const content = String(req.body.content || '').trim().slice(0, 2000);
  if (!content) return res.status(400).json({ error: 'Az üzenet nem lehet üres.' });

  // Verify friendship
  const isFriend = (await pool.query(`
    SELECT 1 FROM friendships WHERE status='accepted' AND ((requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1))
  `, [req.user.id, friendId])).rowCount > 0;
  if (!isFriend) return res.status(403).json({ error: 'Csak elfogadott barátnak küldhetsz üzenetet.' });

  const msg = (await pool.query(`
    INSERT INTO messages(sender_id, receiver_id, content) VALUES($1, $2, $3) RETURNING id, sender_id, receiver_id, content, created_at
  `, [req.user.id, friendId, content])).rows[0];

  res.json({ message: msg });
});

app.use(express.static(path.join(__dirname, 'dist'), { etag: true, maxAge: isProd ? '1h' : 0 }));
app.get('*splat', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'Váratlan szerverhiba történt.' }); });
app.listen(Number(process.env.PORT || 3000), () => console.log(`Qubi listening on ${process.env.PORT || 3000}`));
