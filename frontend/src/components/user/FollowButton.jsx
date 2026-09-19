import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { openAuthModal } from '../../store/slices/uiSlice';
import './FollowButton.css';

/**
 * Follow / Unfollow toggle.
 * - initialFollowing: pass it when the parent already knows the state
 *   (profile page, followers list). Leave undefined to have the button
 *   look it up itself (e.g. on the story page).
 * - onChange(isFollowing, followersCount): fired after a successful toggle.
 */
const FollowButton = ({ userId, initialFollowing, onChange, size = 'sm', className = '' }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const [following, setFollowing] = useState(initialFollowing ?? false);
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (initialFollowing !== undefined) { setFollowing(initialFollowing); return; }
    if (!user || !userId || user._id === userId) return;
    let cancelled = false;
    api.get(`/users/${userId}/follow-status`)
      .then(r => { if (!cancelled) setFollowing(!!r.data.isFollowing); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [initialFollowing, userId, user]);

  if (!userId || user?._id === userId) return null;

  const toggle = async (e) => {
    // Buttons may sit inside a <Link>/card — don't navigate
    e.preventDefault();
    e.stopPropagation();
    if (!user) return dispatch(openAuthModal('login'));
    if (loading) return;
    setLoading(true);
    try {
      const res = following
        ? await api.delete(`/users/${userId}/follow`)
        : await api.post(`/users/${userId}/follow`);
      setFollowing(res.data.isFollowing);
      onChange?.(res.data.isFollowing, res.data.followersCount);
      toast.success(res.data.isFollowing ? 'Following!' : 'Unfollowed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const label = following ? (hover ? 'Unfollow' : 'Following') : 'Follow';

  return (
    <button
      type="button"
      className={`btn btn-${following ? 'ghost' : 'gold'} ${size === 'sm' ? 'btn-sm' : ''} follow-btn ${following ? 'follow-btn--following' : ''} ${className}`}
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={loading}
      aria-pressed={following}
    >
      {loading ? '…' : label}
    </button>
  );
};

export default FollowButton;
