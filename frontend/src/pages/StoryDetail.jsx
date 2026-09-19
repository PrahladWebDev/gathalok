import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStory } from '../store/slices/storySlice';
import { openAuthModal } from '../store/slices/uiSlice';
import api from '../utils/api';
import StoryCard from '../components/story/StoryCard';
import FollowButton from '../components/user/FollowButton';
import { getCategory } from '../assets/data/categories';
import toast from 'react-hot-toast';
import './StoryDetail.css';

const Stars = ({ value, interactive, onRate }) => (
  <div className={`stars-row ${interactive ? 'stars-row--interactive' : ''}`}>
    {[1,2,3,4,5].map(i => (
      <button
        key={i}
        className={`star-btn ${i <= value ? 'star-btn--filled' : ''}`}
        onClick={() => interactive && onRate && onRate(i)}
        disabled={!interactive}
        aria-label={`Rate ${i} star${i !== 1 ? 's' : ''}`}
      >★</button>
    ))}
  </div>
);

const CommentItem = ({ comment, onLike, onDelete, onReply, onReport, userId, storyId, depth = 0 }) => {
  const [showReplyBox, setShowReplyBox] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');
  const [replyLoading, setReplyLoading] = React.useState(false);
  const [replies, setReplies] = React.useState([]);
  const [showReplies, setShowReplies] = React.useState(false);
  const [loadingReplies, setLoadingReplies] = React.useState(false);

  const loadReplies = async () => {
    if (showReplies) { setShowReplies(false); return; }
    setLoadingReplies(true);
    try {
      const res = await api.get(`/comments/${storyId}`, { params: { parent: comment._id } });
      setReplies(res.data.data || []);
      setShowReplies(true);
    } catch {}
    setLoadingReplies(false);
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplyLoading(true);
    try {
      const res = await api.post(`/comments/${storyId}`, { content: replyText, parent: comment._id });
      setReplies(prev => [res.data.data, ...prev]);
      setShowReplies(true);
      setReplyText('');
      setShowReplyBox(false);
      if (onReply) onReply(comment._id);
      toast.success('Reply posted!');
    } catch { toast.error('Failed to post reply.'); }
    setReplyLoading(false);
  };

  return (
    <div className={`comment ${depth > 0 ? 'comment--reply' : ''}`}>
      <div className="comment__avatar">
        {comment.author?.avatar?.url
          ? <img src={comment.author.avatar.url} alt={comment.author.name} />
          : <div className="comment__avatar-fallback">{comment.author?.name?.[0]?.toUpperCase() || '?'}</div>
        }
      </div>
      <div className="comment__body">
        <div className="comment__header">
          <span className="comment__author">{comment.author?.name || 'Anonymous'}</span>
          <span className="comment__date">{new Date(comment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        <p className="comment__content">{comment.content}</p>
        <div className="comment__actions">
          <button className="comment__like-btn" onClick={() => onLike(comment._id)}>
            ♥ {comment.likeCount || 0}
          </button>
          {userId && depth === 0 && (
            <button className="comment__reply-btn" onClick={() => setShowReplyBox(v => !v)}>
              ↩ Reply
            </button>
          )}
          {comment.replyCount > 0 && depth === 0 && (
            <button className="comment__show-replies-btn" onClick={loadReplies} disabled={loadingReplies}>
              {loadingReplies ? '…' : showReplies ? `▲ Hide replies` : `▼ ${comment.replyCount} repl${comment.replyCount === 1 ? 'y' : 'ies'}`}
            </button>
          )}
          {userId && userId !== comment.author?._id && (
            <button className="comment__report-btn" onClick={() => onReport && onReport(comment._id, 'comment')} title="Report comment">
              ⚑ Report
            </button>
          )}
          {userId === comment.author?._id && (
            <button className="comment__delete-btn" onClick={() => onDelete(comment._id)}>Delete</button>
          )}
        </div>

        {showReplyBox && (
          <form className="comment__reply-form" onSubmit={submitReply}>
            <textarea
              className="form-textarea comment__reply-textarea"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write a reply…"
              rows={2}
            />
            <div className="comment__reply-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowReplyBox(false)}>Cancel</button>
              <button type="submit" className="btn btn-gold btn-sm" disabled={!replyText.trim() || replyLoading}>
                {replyLoading ? 'Posting…' : 'Reply'}
              </button>
            </div>
          </form>
        )}

        {showReplies && replies.length > 0 && (
          <div className="comment__replies">
            {replies.map(r => (
              <CommentItem
                key={r._id}
                comment={r}
                onLike={onLike}
                onDelete={onDelete}
                onReport={onReport}
                userId={userId}
                storyId={storyId}
                depth={1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StoryDetail = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { current: story, loading, error } = useSelector(s => s.stories);
  const { user } = useSelector(s => s.auth);

  const [bookmarked, setBookmarked] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [reportModal, setReportModal] = useState(null); // { targetId, targetType }
  const [reportReason, setReportReason] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchStory(slug));
    window.scrollTo(0, 0);
  }, [slug, dispatch]);

  useEffect(() => {
    if (!story?._id) return;
    // Load comments
    api.get(`/comments/${story._id}`).then(r => setComments(r.data.data || [])).catch(() => {});
    // Init likes from story
    setLikesCount(story.likesCount || 0);
    if (user) {
      setLiked(story.likes?.some(id => id === user._id || id?.toString() === user._id?.toString()) || false);
    }
    // Load user's rating
    if (user) {
      api.get(`/ratings/${story._id}/me`).then(r => setUserRating(r.data.data?.value || 0)).catch(() => {});
      api.get('/bookmarks').then(r => {
        setBookmarked(r.data.data?.some(b => b.story?._id === story._id || b.story === story._id));
      }).catch(() => {});
    }
  }, [story?._id, user]);

  const handleBookmark = async () => {
    if (!user) return dispatch(openAuthModal('login'));
    try {
      const res = await api.post(`/bookmarks/${story._id}`);
      setBookmarked(res.data.bookmarked);
      toast.success(res.data.message);
    } catch { toast.error('Failed to bookmark.'); }
  };

  const handleLikeStory = async () => {
    if (!user) return dispatch(openAuthModal('login'));
    try {
      const res = await api.patch(`/stories/${story._id}/like`);
      setLiked(res.data.liked);
      setLikesCount(res.data.likesCount);
      toast.success(res.data.liked ? '❤️ Liked!' : 'Like removed.');
    } catch { toast.error('Failed to like.'); }
  };

  const handleRate = async (value) => {
    if (!user) return dispatch(openAuthModal('login'));
    try {
      const res = await api.post(`/ratings/${story._id}`, { value });
      setUserRating(value);
      toast.success(`Rated ${value} ★`);
    } catch { toast.error('Failed to rate.'); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) return dispatch(openAuthModal('login'));
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const res = await api.post(`/comments/${story._id}`, { content: commentText });
      setComments(prev => [res.data.data, ...prev]);
      setCommentText('');
      toast.success('Comment posted!');
    } catch { toast.error('Failed to post comment.'); }
    setCommentLoading(false);
  };

  const handleLike = async (commentId) => {
    if (!user) return dispatch(openAuthModal('login'));
    try {
      const res = await api.patch(`/comments/${commentId}/like`);
      setComments(prev => prev.map(c => c._id === commentId
        ? { ...c, likeCount: res.data.likeCount }
        : c
      ));
    } catch {}
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setComments(prev => prev.filter(c => c._id !== commentId));
      toast.success('Comment deleted.');
    } catch { toast.error('Failed to delete.'); }
  };

  const handleReport = (targetId, targetType) => {
    if (!user) return dispatch(openAuthModal('login'));
    setReportModal({ targetId, targetType });
    setReportReason('');
  };

  const submitReport = async () => {
    if (!reportReason) { toast.error('Please select a reason.'); return; }
    setReportLoading(true);
    try {
      await api.post('/stories/report', { targetId: reportModal.targetId, targetType: reportModal.targetType, reason: reportReason });
      toast.success('Report submitted. Thank you!');
      setReportModal(null);
    } catch { toast.error('Failed to submit report.'); }
    setReportLoading(false);
  };


  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  if (loading) return (
    <div className="story-detail story-detail--loading">
      <div className="loading-screen">
        <div className="spinner" />
        <p>Summoning the tale…</p>
      </div>
    </div>
  );

  if (error || !story) return (
    <div className="story-detail">
      <div className="container">
        <div className="empty-state" style={{ padding: '8rem 0' }}>
          <div className="icon">📜</div>
          <h3>Story not found</h3>
          <p>This tale may have been lost to time.</p>
          <Link to="/explore" className="btn btn-gold" style={{ margin: '1rem auto 0' }}>Explore Stories</Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
    <div className="story-detail">
      {/* Hero */}
      <div className="story-detail__hero">
        {/* Left — full cover image */}
        {story.coverImage?.url && (
          <div className="story-detail__hero-image-wrap">
            <img
              src={story.coverImage.url}
              alt={story.title}
              className="story-detail__hero-image"
            />
          </div>
        )}
        {/* Right — text content */}
        <div className="story-detail__hero-content">
          {/* Breadcrumb */}
          <nav className="story-detail__breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/explore">Explore</Link>
            <span>/</span>
            <Link to={`/countries/${encodeURIComponent(story.country)}`}>{story.country}</Link>
            <span>/</span>
            <span>{story.title}</span>
          </nav>

          <div className="story-detail__meta-row">
            {story.category && (
              <span className="badge badge-gold">
                {getCategory(story.category)?.icon} {getCategory(story.category)?.name}
              </span>
            )}
            {story.isFeatured && <span className="badge badge-saffron">⭐ Featured</span>}
          </div>

          <h1 className="story-detail__title">{story.title}</h1>

          {story.alternativeNames?.length > 0 && (
            <p className="story-detail__alt-names">
              Also known as: {story.alternativeNames.join(', ')}
            </p>
          )}

          <div className="story-detail__info-row">
            <span>📍 {story.country}</span>
            <span>👁 {story.views?.toLocaleString()} views</span>
            <span>★ {story.averageRating?.toFixed(1) || 'Unrated'} ({story.totalRatings || 0} ratings)</span>
            <span>💬 {story.totalComments || 0} comments</span>
          </div>
        </div>
      </div>

      <div className="container story-detail__body">
        <div className="story-detail__layout">
          {/* Main Content */}
          <main className="story-detail__main">
            {/* Contributor */}
            {story.contributor && (
              <div className="story-detail__contributor">
                <Link to={`/u/${story.contributor.username}`} className="story-detail__contributor-link">
                  <div className="story-detail__contributor-avatar">
                    {story.contributor.avatar?.url
                      ? <img src={story.contributor.avatar.url} alt={story.contributor.name} />
                      : <div className="story-detail__contributor-fallback">{story.contributor.name?.[0]}</div>
                    }
                  </div>
                  <div>
                    <p className="story-detail__contributor-label">Contributed by</p>
                    <p className="story-detail__contributor-name">{story.contributor.name}</p>
                  </div>
                </Link>
                <FollowButton userId={story.contributor._id} />
              </div>
            )}

            {/* Short description */}
            <blockquote className="story-detail__blockquote">
              {story.shortDescription}
            </blockquote>

            {/* Full Story */}
            <div className="story-detail__section">
              <h2 className="story-detail__section-title">The Legend</h2>
              <div className="prose">
                {story.fullStory?.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>

            {/* Origin */}
            {story.origin && (
              <div className="story-detail__section">
                <h2 className="story-detail__section-title">Historical Origin</h2>
                <div className="prose"><p>{story.origin}</p></div>
              </div>
            )}

            {/* Cultural Significance */}
            {story.significance && (
              <div className="story-detail__section">
                <h2 className="story-detail__section-title">Cultural Significance</h2>
                <div className="prose"><p>{story.significance}</p></div>
              </div>
            )}

            {/* Tags */}
            {story.tags?.length > 0 && (
              <div className="story-detail__tags">
                {story.tags.map(tag => (
                  <Link key={tag} to={`/explore?tag=${tag}`} className="story-detail__tag">
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Image Gallery */}
            {story.images?.length > 0 && (
              <div className="story-detail__section">
                <h2 className="story-detail__section-title">Gallery</h2>
                <div className="story-detail__gallery">
                  {story.images.map((img, i) => (
                    <div key={i} className="story-detail__gallery-item">
                      <img src={img.url} alt={img.caption || `Image ${i + 1}`} />
                      {img.caption && <p className="story-detail__gallery-caption">{img.caption}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* References */}
            {story.references?.length > 0 && (
              <div className="story-detail__section">
                <h2 className="story-detail__section-title">References</h2>
                <ul className="story-detail__references">
                  {story.references.map((ref, i) => (
                    <li key={i}>
                      {ref.url
                        ? <a href={ref.url} target="_blank" rel="noopener noreferrer">{ref.title || ref.url}</a>
                        : ref.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rating Section */}
            <div className="story-detail__section story-detail__rating-section">
              <h2 className="story-detail__section-title">Rate This Story</h2>
              <div className="story-detail__rating-widget">
                <Stars value={userRating} interactive onRate={handleRate} />
                <p className="story-detail__rating-hint">
                  {userRating > 0
                    ? `You rated this ${userRating} star${userRating !== 1 ? 's' : ''}`
                    : user ? 'Tap a star to rate' : 'Sign in to rate this story'}
                </p>
                <p className="story-detail__rating-avg">
                  Average: {story.averageRating?.toFixed(1) || '—'} / 5 from {story.totalRatings || 0} readers
                </p>
              </div>
            </div>

            {/* Comments */}
            <div className="story-detail__section" id="comments">
              <h2 className="story-detail__section-title">
                Community Discussion ({story.totalComments || comments.length})
              </h2>

              {/* Comment form */}
              <form className="comment-form" onSubmit={handleComment}>
                <textarea
                  className="form-textarea"
                  placeholder={user ? 'Share your thoughts on this legend…' : 'Sign in to join the discussion'}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  disabled={!user}
                  rows={3}
                />
                <div className="comment-form__footer">
                  {!user && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => dispatch(openAuthModal('login'))}
                    >Sign in to comment</button>
                  )}
                  {user && (
                    <button
                      type="submit"
                      className="btn btn-gold btn-sm"
                      disabled={!commentText.trim() || commentLoading}
                    >{commentLoading ? 'Posting…' : 'Post Comment'}</button>
                  )}
                </div>
              </form>

              {/* Comment list */}
              <div className="comments-list">
                {comments.length === 0 ? (
                  <p className="comments-empty">Be the first to share your thoughts on this legend.</p>
                ) : (
                  comments.map(c => (
                    <CommentItem
                      key={c._id}
                      comment={c}
                      onLike={handleLike}
                      onDelete={handleDeleteComment}
                      onReport={handleReport}
                      userId={user?._id}
                      storyId={story._id}
                    />
                  ))
                )}
              </div>
            </div>
          </main>

          {/* Sidebar */}
          <aside className="story-detail__sidebar">
            {/* Actions */}
            <div className="story-detail__action-card">
              {user && story.contributor && user._id === story.contributor._id && (
                <Link
                  to={`/contribute/edit/${story._id}`}
                  className="story-detail__action-btn story-detail__action-btn--active"
                >
                  ✎ Edit Story
                </Link>
              )}
              {user && (
                <button
                  className="story-detail__action-btn story-detail__action-btn--report"
                  onClick={() => handleReport(story._id, 'story')}
                >
                  ⚑ Report Story
                </button>
              )}
              <button
                className={`story-detail__action-btn ${liked ? 'story-detail__action-btn--active' : ''}`}
                onClick={handleLikeStory}
              >
                {liked ? '❤️' : '🤍'} {likesCount > 0 ? likesCount : ''} {liked ? 'Liked' : 'Like'}
              </button>
              <button
                className={`story-detail__action-btn ${bookmarked ? 'story-detail__action-btn--active' : ''}`}
                onClick={handleBookmark}
              >
                {bookmarked ? '🔖 Bookmarked' : '🔖 Bookmark'}
              </button>
              <button className="story-detail__action-btn" onClick={handleShare}>
                📤 Share
              </button>
              <Link
                to={`/explore?country=${encodeURIComponent(story.country)}`}
                className="story-detail__action-btn"
              >
                🗺 More from {story.country}
              </Link>
            </div>

            {/* Story Info */}
            <div className="story-detail__info-card">
              <h4>Story Details</h4>
              <dl className="story-detail__info-list">
                <dt>Country</dt><dd>{story.country}</dd>
                <dt>Category</dt><dd>{getCategory(story.category)?.icon} {getCategory(story.category)?.name}</dd>
                <dt>Views</dt><dd>{story.views?.toLocaleString()}</dd>
                <dt>Rating</dt><dd>★ {story.averageRating?.toFixed(1) || 'N/A'}</dd>
                <dt>Added</dt><dd>{new Date(story.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</dd>
              </dl>
            </div>

            {/* Related */}
            {story.related?.length > 0 && (
              <div className="story-detail__related">
                <h4>Related Stories</h4>
                {story.related.map(r => (
                  <Link key={r._id} to={`/stories/${r.slug}`} className="story-detail__related-item">
                    <div
                      className="story-detail__related-img"
                      style={{ backgroundImage: r.coverImage?.url ? `url(${r.coverImage.url})` : undefined }}
                    />
                    <div>
                      <p className="story-detail__related-title">{r.title}</p>
                      <p className="story-detail__related-meta">📍 {r.country}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>

      {/* Report Modal */}
      {reportModal && (
        <div className="modal-overlay" onClick={() => setReportModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Report {reportModal.targetType === 'story' ? 'Story' : 'Comment'}</h3>
            <p className="modal-desc">Help us keep GathaLok accurate and respectful.</p>
            <div className="report-reasons">
              {['spam', 'inaccurate', 'offensive', 'copyright', 'other'].map(r => (
                <label key={r} className={`report-reason ${reportReason === r ? 'report-reason--selected' : ''}`}>
                  <input type="radio" name="reason" value={r} checked={reportReason === r}
                    onChange={() => setReportReason(r)} />
                  <span>{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setReportModal(null)}>Cancel</button>
              <button className="btn btn-gold btn-sm" onClick={submitReport} disabled={reportLoading || !reportReason}>
                {reportLoading ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StoryDetail;
