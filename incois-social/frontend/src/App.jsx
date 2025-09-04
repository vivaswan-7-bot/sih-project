import React, { useEffect, useMemo, useState } from 'react';
import { AuthAPI, PostAPI, DashboardAPI } from './api';

const EVENT_TYPES = ['flood','tsunami','cyclone','high_waves','other'];
const REACTIONS   = ['like','love','sad','alert'];

export default function App() {
  // auth state
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [userId, setUserId] = useState(() => localStorage.getItem('userId') || '');
  const [role, setRole] = useState(() => localStorage.getItem('role') || '');

  // ui state
  const [tab, setTab] = useState(() => (token ? 'feed' : 'auth')); // auth | feed | new | dashboard
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', role: 'citizen' });

  // feed
  const [feed, setFeed] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [filterEvent, setFilterEvent] = useState('');



  // new post
  const [postForm, setPostForm] = useState({
    title: '',
    description: '',
    eventType: 'flood',
    latitude: '',
    longitude: '',
    media: '', 
  });
  const [creating, setCreating] = useState(false);

  const [text, setText] = useState('');
  const [media, setMedia] = useState(null);

  // comment text per post id
  const [commentText, setCommentText] = useState({});

  // dashboard
  const [summary, setSummary] = useState(null);
  const [reports, setReports] = useState([]);
  const canSeeDashboard = useMemo(() => role === 'official' || role === 'analyst', [role]);

  // helpers
  function rememberSession({ token, userId, role }) {
    setToken(token); setUserId(userId); setRole(role);
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('role', role);
  }
  function logout() {
    setToken(''); setUserId(''); setRole('');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    setTab('auth');
  }

  // auth actions
  async function handleAuth(e) {
    e.preventDefault();
    try {
      if (authMode === 'register') {
        const res = await AuthAPI.register({
          name: authForm.name,
          email: authForm.email,
          password: authForm.password,
          role: authForm.role,
        });
        rememberSession(res.data);
      } else {
        const res = await AuthAPI.login({
          email: authForm.email,
          password: authForm.password,
        });
        rememberSession(res.data);
      }
      setTab('feed');
    } catch (err) {
      alert('Auth error: ' + err.message);
    }
  }

  // feed loading
  async function loadFeed() {
    try {
      setLoadingFeed(true);
      const data = await PostAPI.feed({
        limit: 50,
        ...(filterEvent ? { eventType: filterEvent } : {}),
      });
      // API returns an array directly
      setFeed(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      alert('Feed error: ' + err.message);
    } finally {
      setLoadingFeed(false);
    }
  }
  useEffect(() => { if (tab === 'feed') loadFeed(); }, [tab, filterEvent]);

  // create post
  async function handleCreatePost(e) {
    e.preventDefault();
    if (!token) return alert('Please login first.');
    setCreating(true);
    try {
      const payload = {
      title: postForm.title,
      description: postForm.description,
      eventType: postForm.eventType,
      latitude: postForm.latitude ? Number(postForm.latitude) : undefined,
      longitude: postForm.longitude ? Number(postForm.longitude) : undefined,
      media: postForm.media || [], // array of File objects from input
      };
      await PostAPI.create(token, payload);
      alert('Post created!');
      setPostForm({ title:'', description:'', eventType:'flood', latitude:'', longitude:'', media:'' });
      setTab('feed');
      loadFeed();
    } catch (err) {
      alert('Create error: ' + err.message);
    } finally {
      setCreating(false);
    }
  }

  // post actions
  async function likePost(id) {
    if (!token) return alert('Login to like');
    try { await PostAPI.like(token, id); await loadFeed(); }
    catch (e) { alert(e.message); }
  }
  async function doReact(id, reaction) {
    if (!token) return alert('Login to react');
    try { await PostAPI.react(token, id, reaction); await loadFeed(); }
    catch (e) { alert(e.message); }
  }
  async function doRepost(id) {
    if (!token) return alert('Login to repost');
    try { await PostAPI.repost(token, id); await loadFeed(); }
    catch (e) { alert(e.message); }
  }
  async function addComment(id) {
    if (!token) return alert('Login to comment');
    const text = (commentText[id] || '').trim();
    if (!text) return;
    try {
      await PostAPI.comment(token, id, text);
      setCommentText({ ...commentText, [id]: '' });
      await loadFeed();
    } catch (e) {
      alert(e.message);
    }
  }

  // dashboard
  async function loadDashboard() {
    try {
      const s = await DashboardAPI.summary(token);
      const r = await DashboardAPI.reports(token, { limit: 10 });
      setSummary(s);
      setReports(Array.isArray(r) ? r : r?.data || []);
    } catch (e) {
      alert('Dashboard error: ' + e.message);
    }
  }
  useEffect(() => { if (tab === 'dashboard' && canSeeDashboard) loadDashboard(); }, [tab, canSeeDashboard]);

  // UI
  return (
    <div style={appContainerStyle}>
      <Header token={token} role={role} onLogout={logout} tab={tab} setTab={setTab} canSeeDashboard={canSeeDashboard} />

      <div style={contentWrapperStyle}>
        {tab === 'auth' && (
          <AuthCard
            authMode={authMode}
            setAuthMode={setAuthMode}
            authForm={authForm}
            setAuthForm={setAuthForm}
            onSubmit={handleAuth}
          />
        )}

        {tab === 'new' && (
          <NewPostCard
            postForm={postForm}
            setPostForm={setPostForm}
            onSubmit={handleCreatePost}
            creating={creating}
          />
        )}

        {tab === 'feed' && (
          <Feed
            loading={loadingFeed}
            feed={feed}
            filterEvent={filterEvent}
            setFilterEvent={setFilterEvent}
            likePost={likePost}
            doReact={doReact}
            doRepost={doRepost}
            commentText={commentText}
            setCommentText={setCommentText}
            addComment={addComment}
          />
        )}

        {tab === 'dashboard' && canSeeDashboard && (
          <Dashboard summary={summary} reports={reports} reload={loadDashboard} />
        )}

        {tab === 'dashboard' && !canSeeDashboard && (
          <div style={restrictedAccessStyle}>
            <div style={restrictedIconStyle}>🔒</div>
            <h3 style={restrictedTitleStyle}>Access Restricted</h3>
            <p style={restrictedTextStyle}>Only officials and analysts can access the dashboard.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== UI Components ===== */

function Header({ token, role, onLogout, tab, setTab, canSeeDashboard }) {
  return (
    <header style={headerStyle}>
      <div style={headerContentStyle}>
        <div style={brandStyle}>
          <div style={logoStyle}>🌊</div>
          <h1 style={titleStyle}>INCOIS Social</h1>
          <span style={subtitleStyle}>Ocean Intelligence Platform</span>
        </div>

        <nav style={navStyle}>
          {!token ? (
            <button onClick={() => setTab('auth')} style={signInBtnStyle}>
              Sign In
            </button>
          ) : (
            <div style={navContentStyle}>
              <div style={tabsStyle}>
                <button 
                  onClick={() => setTab('feed')} 
                  style={tab === 'feed' ? selectedTabStyle : tabStyle}
                >
                  🏠 Feed
                </button>
                <button 
                  onClick={() => setTab('new')} 
                  style={tab === 'new' ? selectedTabStyle : tabStyle}
                >
                  ✏️ New Post
                </button>
                {canSeeDashboard && (
                  <button 
                    onClick={() => setTab('dashboard')} 
                    style={tab === 'dashboard' ? selectedTabStyle : tabStyle}
                  >
                    📊 Dashboard
                  </button>
                )}
              </div>
              
              <div style={userInfoStyle}>
                <span style={roleTagStyle}>{role}</span>
                <button onClick={onLogout} style={logoutBtnStyle}>
                  Logout
                </button>
              </div>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

function AuthCard({ authMode, setAuthMode, authForm, setAuthForm, onSubmit }) {
  return (
    <div style={authCardStyle}>
      <div style={authHeaderStyle}>
        <h2 style={authTitleStyle}>Welcome to INCOIS Social</h2>
        <p style={authSubtitleStyle}>Connect and share ocean intelligence</p>
      </div>

      <div style={authToggleStyle}>
        <button 
          onClick={() => setAuthMode('login')} 
          style={authMode === 'login' ? selectedAuthBtnStyle : authBtnStyle}
        >
          Login
        </button>
        <button 
          onClick={() => setAuthMode('register')} 
          style={authMode === 'register' ? selectedAuthBtnStyle : authBtnStyle}
        >
          Register
        </button>
      </div>

      <form onSubmit={onSubmit} style={formStyle}>
        {authMode === 'register' && (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Full Name</label>
              <input 
                value={authForm.name} 
                onChange={e=>setAuthForm({...authForm, name:e.target.value})} 
                style={inputStyle}
                placeholder="Enter your full name"
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Role</label>
              <select 
                value={authForm.role} 
                onChange={e=>setAuthForm({...authForm, role:e.target.value})} 
                style={selectStyle}
              >
                <option value="citizen">Citizen</option>
                <option value="official">Official</option>
                <option value="analyst">Analyst</option>
              </select>
            </div>
          </>
        )}
        <div style={fieldStyle}>
          <label style={labelStyle}>Email Address</label>
          <input 
            type="email"
            value={authForm.email} 
            onChange={e=>setAuthForm({...authForm, email:e.target.value})} 
            style={inputStyle}
            placeholder="Enter your email"
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Password</label>
          <input 
            type="password" 
            value={authForm.password} 
            onChange={e=>setAuthForm({...authForm, password:e.target.value})} 
            style={inputStyle}
            placeholder="Enter your password"
          />
        </div>
        <button type="submit" style={submitBtnStyle}>
          {authMode === 'register' ? 'Create Account' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

function NewPostCard({ postForm, setPostForm, onSubmit, creating }) {
  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <h3 style={cardTitleStyle}>Create New Post</h3>
        <p style={cardSubtitleStyle}>Share ocean intelligence and alerts</p>
      </div>

      <form onSubmit={onSubmit} style={formStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Title</label>
          <input 
            value={postForm.title} 
            onChange={e=>setPostForm({...postForm, title:e.target.value})} 
            style={inputStyle}
            placeholder="Enter post title"
          />
        </div>
        
        <div style={fieldStyle}>
          <label style={labelStyle}>Description</label>
          <textarea 
            value={postForm.description} 
            onChange={e=>setPostForm({...postForm, description:e.target.value})} 
            style={textareaStyle}
            placeholder="Describe the ocean event or situation"
            rows="4"
          />
        </div>
        
        <div style={fieldStyle}>
          <label style={labelStyle}>Event Type</label>
          <select 
            value={postForm.eventType} 
            onChange={e=>setPostForm({...postForm, eventType:e.target.value})} 
            style={selectStyle}
          >
            {EVENT_TYPES.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
          </select>
        </div>
        
        <div style={coordinatesStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Latitude</label>
            <input 
              value={postForm.latitude} 
              onChange={e=>setPostForm({...postForm, latitude:e.target.value})} 
              style={inputStyle}
              placeholder="e.g., 12.9716"
              type="number"
              step="any"
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Longitude</label>
            <input 
              value={postForm.longitude} 
              onChange={e=>setPostForm({...postForm, longitude:e.target.value})} 
              style={inputStyle}
              placeholder="e.g., 77.5946"
              type="number"
              step="any"
            />
          </div>
        </div>
        
        <div style={fieldStyle}>
          <label style={labelStyle}>Media URLs</label>
          <input
          type="file"
          multiple
          onChange={(e) => setPostForm({ ...postForm, media: Array.from(e.target.files) })}
          />
        </div>

        <button disabled={creating} type="submit" style={creating ? disabledBtnStyle : submitBtnStyle}>
          {creating ? '⏳ Creating...' : '📝 Create Post'}
        </button>
      </form>
    </div>
  );
}

function Feed({
  loading, feed, filterEvent, setFilterEvent,
  likePost, doReact, doRepost,
  commentText, setCommentText, addComment
}) {
  return (
    <div style={feedContainerStyle}>
      <div style={feedHeaderStyle}>
        <div style={filterContainerStyle}>
          <label style={filterLabelStyle}>Filter by Event:</label>
          <select 
            value={filterEvent} 
            onChange={e=>setFilterEvent(e.target.value)} 
            style={filterSelectStyle}
          >
            <option value="">All Events</option>
            {EVENT_TYPES.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {loading && <div style={loadingStyle}>🌊 Loading feed...</div>}
      {!loading && feed.length === 0 && (
        <div style={emptyStateStyle}>
          <div style={emptyIconStyle}>📭</div>
          <h3>No posts yet</h3>
          <p>Be the first to share ocean intelligence!</p>
        </div>
      )}

      <div style={postsContainerStyle}>
  {feed.map(p => (
    <div key={p._id} style={postCardStyle}>
      <div style={postHeaderStyle}>
        <h3 style={postTitleStyle}>{p.title}</h3>
        <span style={eventBadgeStyle(p.eventType)}>{p.eventType}</span>
      </div>
      
      <p style={postDescriptionStyle}>{p.description}</p>
      
      {(typeof p.latitude === 'number' && typeof p.longitude === 'number') && (
        <div style={locationStyle}>
          📍 {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
        </div>
      )}

      {/* 🔽 Media rendering */}
      {!!(p.media && p.media.length) && (
        <div style={mediaStyle}>
          {p.media.map((m, i) => {
            // handle both string and object
            const filePath = typeof m === "string" ? m : m.url || "";
            if (!filePath) return null;

            // ensure we only prefix localhost if it's not already an absolute URL
            const url = filePath.startsWith("http")
              ? filePath
              : `http://localhost:4000${filePath.startsWith("/") ? filePath : "/" + filePath}`;

            // check extension to decide between image or video
            if (/\.(mp4|webm|ogg)$/i.test(url)) {
              return (
                <video
                  key={i}
                  controls
                  style={{ maxWidth: "100%", borderRadius: "8px", marginTop: "8px" }}
                >
                  <source src={url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              );
            } else {
              return (
                <img
                  key={i}
                  src={url}
                  alt="post media"
                  style={{ maxWidth: "100%", borderRadius: "8px", marginTop: "8px" }}
                />
              );
            }
          })}
        </div>
      )}
    



            <div style={actionsStyle}>
              <button onClick={() => likePost(p._id)} style={actionBtnStyle}>
                👍 Like
              </button>
              {REACTIONS.map(r => (
                <button key={r} onClick={() => doReact(p._id, r)} style={reactionBtnStyle}>
                  {getReactionIcon(r)} {r}
                </button>
              ))}
              <button onClick={() => doRepost(p._id)} style={actionBtnStyle}>
                🔁 Repost
              </button>
            </div>

            <div style={engagementStyle}>
              <span>👍 {p.engagement?.likes?.length || 0}</span>
              <span>💬 {p.engagement?.comments?.length || 0}</span>
              <span>❤️ {p.engagement?.reactions?.length || 0}</span>
              <span>🔁 {p.engagement?.reposts?.length || 0}</span>
            </div>

            <div style={commentSectionStyle}>
              <div style={commentInputContainerStyle}>
                <input
                  placeholder="Write a comment..."
                  value={commentText[p._id] || ''}
                  onChange={e=>setCommentText({ ...commentText, [p._id]: e.target.value })}
                  style={commentInputStyle}
                />
                <button onClick={() => addComment(p._id)} style={commentBtnStyle}>
                  💬
                </button>
              </div>

              {!!(p.engagement?.comments?.length) && (
                <div style={commentsListStyle}>
                  <div style={commentsHeaderStyle}>Comments</div>
                  {p.engagement.comments.slice(-3).map(c => (
                    <div key={c._id} style={commentStyle}>
                      <div style={commentTextStyle}>{c.text}</div>
                      <div style={commentTimeStyle}>
                        {new Date(c.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ summary, reports, reload }) {
  return (
    <div style={dashboardContainerStyle}>
      <div style={dashboardHeaderStyle}>
        <h3 style={dashboardTitleStyle}>Analytics Dashboard</h3>
        <button onClick={reload} style={refreshBtnStyle}>
          🔄 Refresh
        </button>
      </div>

      {!summary && <div style={loadingCardStyle}>📊 Loading summary...</div>}
      
      {summary && (
        <div style={summaryCardStyle}>
          <h4 style={summaryTitleStyle}>Overview</h4>
          <div style={statsGridStyle}>
            <div style={statItemStyle}>
              <div style={statValueStyle}>{summary.totals?.posts ?? '-'}</div>
              <div style={statLabelStyle}>Total Posts</div>
            </div>
            <div style={statItemStyle}>
              <div style={statValueStyle}>{summary.totals?.recent24h ?? '-'}</div>
              <div style={statLabelStyle}>Last 24 Hours</div>
            </div>
          </div>
          
          <div style={eventBreakdownStyle}>
            <h5 style={breakdownTitleStyle}>Events by Type</h5>
            <div style={eventStatsStyle}>
              {Object.entries(summary.byEventType || {}).map(([k,v]) => (
                <div key={k} style={eventStatStyle}>
                  <span style={eventNameStyle}>{k}</span>
                  <span style={eventCountStyle}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={reportsContainerStyle}>
        <h4 style={reportsTitleStyle}>Recent Reports</h4>
        {reports?.map(r => (
          <div key={r._id} style={reportCardStyle}>
            <div style={reportHeaderStyle}>
              <h5 style={reportTitleStyle}>{r.title}</h5>
              <span style={eventBadgeStyle(r.eventType)}>{r.eventType}</span>
            </div>
            <div style={reportMetaStyle}>
              📅 {new Date(r.createdAt).toLocaleString()}
            </div>
            <div style={reportDescriptionStyle}>{r.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper function for reaction icons
function getReactionIcon(reaction) {
  const icons = { like: '👍', love: '❤️', sad: '😢', alert: '⚠️' };
  return icons[reaction] || '👍';
}

/* ===== Enhanced Styles ===== */

const appContainerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  color: '#333'
};

const contentWrapperStyle = {
  maxWidth: '1000px',
  margin: '0 auto',
  padding: '20px',
};

const headerStyle = {
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
};

const headerContentStyle = {
  maxWidth: '1000px',
  margin: '0 auto',
  padding: '16px 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
};

const brandStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const logoStyle = {
  width: '40px',
  height: '40px',
  background: 'linear-gradient(135deg, #667eea, #764ba2)',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '20px',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
};

const titleStyle = {
  margin: 0,
  fontSize: '24px',
  fontWeight: '700',
  background: 'linear-gradient(135deg, #667eea, #764ba2)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text'
};

const subtitleStyle = {
  fontSize: '12px',
  color: '#666',
  fontWeight: '500'
};

const navStyle = {
  display: 'flex',
  alignItems: 'center'
};

const navContentStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '24px'
};

const tabsStyle = {
  display: 'flex',
  gap: '4px'
};

const tabStyle = {
  padding: '10px 16px',
  borderRadius: '12px',
  border: 'none',
  background: 'transparent',
  color: '#666',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea'
  }
};

const selectedTabStyle = {
  ...tabStyle,
  background: 'linear-gradient(135deg, #667eea, #764ba2)',
  color: 'white',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
};

const userInfoStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const roleTagStyle = {
  padding: '4px 12px',
  borderRadius: '20px',
  background: 'linear-gradient(135deg, #ffecd2, #fcb69f)',
  color: '#8b4513',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'capitalize'
};

const signInBtnStyle = {
  padding: '10px 24px',
  borderRadius: '12px',
  border: 'none',
  background: 'linear-gradient(135deg, #667eea, #764ba2)',
  color: 'white',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)'
  }
};

const logoutBtnStyle = {
  padding: '8px 16px',
  borderRadius: '10px',
  border: '1px solid #ddd',
  background: 'white',
  color: '#666',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#f8f9fa',
    borderColor: '#bbb'
  }
};

const cardStyle = {
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: '20px',
  padding: '24px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  marginBottom: '20px'
};

const authCardStyle = {
  ...cardStyle,
  maxWidth: '420px',
  margin: '40px auto'
};

const authHeaderStyle = {
  textAlign: 'center',
  marginBottom: '32px'
};

const authTitleStyle = {
  margin: '0 0 8px 0',
  fontSize: '28px',
  fontWeight: '700',
  background: 'linear-gradient(135deg, #667eea, #764ba2)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text'
};

const authSubtitleStyle = {
  margin: 0,
  color: '#666',
  fontSize: '16px'
};

const authToggleStyle = {
  display: 'flex',
  gap: '8px',
  marginBottom: '24px',
  padding: '4px',
  background: '#f8f9fa',
  borderRadius: '12px'
};

const authBtnStyle = {
  flex: 1,
  padding: '10px',
  border: 'none',
  borderRadius: '8px',
  background: 'transparent',
  color: '#666',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

const selectedAuthBtnStyle = {
  ...authBtnStyle,
  background: 'white',
  color: '#667eea',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
};

const formStyle = {
  display: 'grid',
  gap: '20px'
};

const fieldStyle = {
  display: 'grid',
  gap: '6px'
};

const labelStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#333'
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: '2px solid #e9ecef',
  fontSize: '16px',
  transition: 'all 0.2s ease',
  background: 'rgba(255, 255, 255, 0.8)',
  boxSizing: 'border-box',
  ':focus': {
    borderColor: '#667eea',
    outline: 'none',
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)'
  }
};

const textareaStyle = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: '100px'
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer'
};

const submitBtnStyle = {
  padding: '14px 24px',
  borderRadius: '12px',
  border: 'none',
  background: 'linear-gradient(135deg, #667eea, #764ba2)',
  color: 'white',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)'
  }
};

const disabledBtnStyle = {
  ...submitBtnStyle,
  background: '#ccc',
  cursor: 'not-allowed',
  boxShadow: 'none',
  ':hover': {
    transform: 'none'
  }
};

const cardHeaderStyle = {
  marginBottom: '20px'
};

const cardTitleStyle = {
  margin: '0 0 8px 0',
  fontSize: '24px',
  fontWeight: '700',
  color: '#333'
};

const cardSubtitleStyle = {
  margin: 0,
  color: '#666',
  fontSize: '16px'
};

const coordinatesStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px'
};

const feedContainerStyle = {
  maxWidth: '100%'
};

const feedHeaderStyle = {
  marginBottom: '24px'
};

const filterContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: 'rgba(255, 255, 255, 0.9)',
  padding: '16px 20px',
  borderRadius: '16px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
};

const filterLabelStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#333'
};

const filterSelectStyle = {
  padding: '8px 12px',
  borderRadius: '10px',
  border: '2px solid #e9ecef',
  background: 'white',
  fontSize: '14px',
  cursor: 'pointer',
  minWidth: '140px'
};

const loadingStyle = {
  textAlign: 'center',
  padding: '40px',
  fontSize: '18px',
  color: '#667eea',
  background: 'rgba(255, 255, 255, 0.9)',
  borderRadius: '16px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
};

const emptyStateStyle = {
  textAlign: 'center',
  padding: '60px 20px',
  background: 'rgba(255, 255, 255, 0.9)',
  borderRadius: '16px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
};

const emptyIconStyle = {
  fontSize: '48px',
  marginBottom: '16px'
};

const postsContainerStyle = {
  display: 'grid',
  gap: '20px'
};

const postCardStyle = {
  background: 'rgba(255, 255, 255, 0.95)',
  borderRadius: '20px',
  padding: '24px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  transition: 'all 0.2s ease',
  ':hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)'
  }
};

const postHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  marginBottom: '16px',
  gap: '16px'
};

const postTitleStyle = {
  margin: 0,
  fontSize: '20px',
  fontWeight: '700',
  color: '#333',
  flex: 1
};

const eventBadgeStyle = (eventType) => ({
  padding: '6px 14px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  background: getEventColor(eventType),
  color: 'white',
  whiteSpace: 'nowrap'
});

const postDescriptionStyle = {
  margin: '0 0 16px 0',
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#555'
};

const locationStyle = {
  margin: '0 0 12px 0',
  fontSize: '14px',
  color: '#667eea',
  fontWeight: '500'
};

const mediaStyle = {
  margin: '0 0 16px 0',
  fontSize: '14px',
  color: '#28a745',
  fontWeight: '500'
};

const actionsStyle = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  marginBottom: '16px'
};

const actionBtnStyle = {
  padding: '8px 16px',
  borderRadius: '20px',
  border: '2px solid #e9ecef',
  background: 'white',
  color: '#666',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    borderColor: '#667eea',
    color: '#667eea',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 8px rgba(102, 126, 234, 0.2)'
  }
};

const reactionBtnStyle = {
  ...actionBtnStyle,
  fontSize: '13px'
};

const engagementStyle = {
  display: 'flex',
  gap: '16px',
  fontSize: '14px',
  color: '#666',
  marginBottom: '16px',
  paddingTop: '12px',
  borderTop: '1px solid #f0f0f0'
};

const commentSectionStyle = {
  borderTop: '1px solid #f0f0f0',
  paddingTop: '16px'
};

const commentInputContainerStyle = {
  display: 'flex',
  gap: '8px',
  marginBottom: '16px'
};

const commentInputStyle = {
  flex: 1,
  padding: '12px 16px',
  borderRadius: '20px',
  border: '2px solid #e9ecef',
  fontSize: '14px',
  background: '#f8f9fa',
  transition: 'all 0.2s ease',
  ':focus': {
    borderColor: '#667eea',
    outline: 'none',
    background: 'white'
  }
};

const commentBtnStyle = {
  padding: '12px 16px',
  borderRadius: '20px',
  border: 'none',
  background: '#667eea',
  color: 'white',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: '#5a67d8',
    transform: 'scale(1.05)'
  }
};

const commentsListStyle = {
  background: '#f8f9fa',
  borderRadius: '16px',
  padding: '16px'
};

const commentsHeaderStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#333',
  marginBottom: '12px'
};

const commentStyle = {
  background: 'white',
  borderRadius: '12px',
  padding: '12px 16px',
  marginBottom: '8px',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
};

const commentTextStyle = {
  margin: '0 0 4px 0',
  fontSize: '14px',
  color: '#333'
};

const commentTimeStyle = {
  fontSize: '12px',
  color: '#999'
};

const dashboardContainerStyle = {
  maxWidth: '100%'
};

const dashboardHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '24px'
};

const dashboardTitleStyle = {
  margin: 0,
  fontSize: '28px',
  fontWeight: '700',
  background: 'linear-gradient(135deg, #667eea, #764ba2)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text'
};

const refreshBtnStyle = {
  padding: '10px 20px',
  borderRadius: '12px',
  border: 'none',
  background: 'linear-gradient(135deg, #28a745, #20c997)',
  color: 'white',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(40, 167, 69, 0.4)'
  }
};

const loadingCardStyle = {
  ...cardStyle,
  textAlign: 'center',
  padding: '40px',
  fontSize: '18px',
  color: '#667eea'
};

const summaryCardStyle = {
  ...cardStyle,
  marginBottom: '24px'
};

const summaryTitleStyle = {
  margin: '0 0 20px 0',
  fontSize: '20px',
  fontWeight: '700',
  color: '#333'
};

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '20px',
  marginBottom: '24px'
};

const statItemStyle = {
  background: 'linear-gradient(135deg, #667eea, #764ba2)',
  borderRadius: '16px',
  padding: '20px',
  textAlign: 'center',
  color: 'white',
  boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
};

const statValueStyle = {
  fontSize: '32px',
  fontWeight: '700',
  marginBottom: '8px'
};

const statLabelStyle = {
  fontSize: '14px',
  opacity: 0.9,
  fontWeight: '500'
};

const eventBreakdownStyle = {
  paddingTop: '20px',
  borderTop: '1px solid #f0f0f0'
};

const breakdownTitleStyle = {
  margin: '0 0 16px 0',
  fontSize: '18px',
  fontWeight: '600',
  color: '#333'
};

const eventStatsStyle = {
  display: 'grid',
  gap: '8px'
};

const eventStatStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  background: '#f8f9fa',
  borderRadius: '12px'
};

const eventNameStyle = {
  fontSize: '14px',
  fontWeight: '500',
  textTransform: 'capitalize',
  color: '#333'
};

const eventCountStyle = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#667eea'
};

const reportsContainerStyle = {
  marginTop: '32px'
};

const reportsTitleStyle = {
  margin: '0 0 20px 0',
  fontSize: '24px',
  fontWeight: '700',
  color: '#333'
};

const reportCardStyle = {
  background: 'rgba(255, 255, 255, 0.95)',
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '16px',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  transition: 'all 0.2s ease',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
  }
};

const reportHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  marginBottom: '12px',
  gap: '16px'
};

const reportTitleStyle = {
  margin: 0,
  fontSize: '18px',
  fontWeight: '600',
  color: '#333',
  flex: 1
};

const reportMetaStyle = {
  fontSize: '13px',
  color: '#666',
  marginBottom: '12px'
};

const reportDescriptionStyle = {
  fontSize: '15px',
  lineHeight: '1.5',
  color: '#555',
  margin: 0
};

const restrictedAccessStyle = {
  ...cardStyle,
  textAlign: 'center',
  padding: '60px 40px'
};

const restrictedIconStyle = {
  fontSize: '48px',
  marginBottom: '16px'
};

const restrictedTitleStyle = {
  margin: '0 0 12px 0',
  fontSize: '24px',
  fontWeight: '700',
  color: '#333'
};

const restrictedTextStyle = {
  margin: 0,
  fontSize: '16px',
  color: '#666'
};

// Helper function for event colors
function getEventColor(eventType) {
  const colors = {
    flood: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    tsunami: 'linear-gradient(135deg, #f093fb, #f5576c)',
    cyclone: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    high_waves: 'linear-gradient(135deg, #43e97b, #38f9d7)',
    other: 'linear-gradient(135deg, #667eea, #764ba2)'
  };
  return colors[eventType] || colors.other;
}