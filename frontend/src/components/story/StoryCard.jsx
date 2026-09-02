import React from 'react';
import { Link } from 'react-router-dom';
import { getCategory } from '../../assets/data/categories';
import './StoryCard.css';

const Stars = ({ rating }) => {
  return (
    <span className="stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`star ${i <= Math.round(rating) ? '' : 'star-empty'}`}>★</span>
      ))}
    </span>
  );
};

const StoryCard = ({ story, size = 'normal' }) => {
  if (!story) return null;

  const placeholderImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(story.title)}&size=400&background=1E1736&color=B78C3E&bold=true&length=2`;
  const category = getCategory(story.category);

  return (
    <Link to={`/stories/${story.slug}`} className={`story-card story-card--${size}`}>
      <div className="story-card__image-wrap">
        <img
          src={story.coverImage?.url || placeholderImg}
          alt={story.title}
          className="story-card__image"
          loading="lazy"
        />
        <div className="story-card__image-overlay" />
        {story.isFeatured && <span className="story-card__featured-badge">⭐ Featured</span>}
        {category && (
          <span
            className="story-card__cat-badge"
            style={{ '--cat-color': category.color || 'var(--gold)' }}
          >
            {category.icon} {category.name}
          </span>
        )}
      </div>

      <div className="story-card__body">
        <div className="story-card__meta">
          <span className="story-card__state">📍 {story.country}</span>
          <span className="story-card__views">👁 {story.views?.toLocaleString() || 0}</span>
        </div>

        <h3 className="story-card__title">{story.title}</h3>

        {size !== 'compact' && (
          <p className="story-card__excerpt">
            {story.shortDescription?.slice(0, 120)}{story.shortDescription?.length > 120 ? '…' : ''}
          </p>
        )}

        <div className="story-card__footer">
          <div className="story-card__rating">
            <Stars rating={story.averageRating || 0} />
            <span className="story-card__rating-num">
              {story.averageRating ? story.averageRating.toFixed(1) : 'Unrated'}
            </span>
          </div>
          {story.contributor && (
            <span className="story-card__contributor">
              by {story.contributor.name || story.contributor.username}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default StoryCard;
