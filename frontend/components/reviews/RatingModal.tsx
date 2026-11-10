'use client';

import React, { useState } from 'react';
import { rateShop } from '@/lib/api';

interface RatingModalProps {
  shopId: string;
  shopName: string;
  bookingId?: string;
  serviceName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (rating: number) => void;
}

const TAG_OPTIONS = [
  '✂️ Clean fade',
  '⚡ Zero wait',
  '🔥 Crisp lineup',
  '💈 Great conversation',
  '✨ Super clean shop',
  '👌 On time',
];

export default function RatingModal({
  shopId,
  shopName,
  bookingId,
  serviceName,
  isOpen,
  onClose,
  onSubmitted,
}: RatingModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeRating = hoverRating ?? rating;

  const ratingLabels: Record<number, string> = {
    1: 'Needs improvement',
    2: 'Fair',
    3: 'Good cut',
    4: 'Great service!',
    5: 'Master cut! ⭐',
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const fullComment = [
        selectedTags.join(', '),
        comment.trim(),
      ]
        .filter(Boolean)
        .join(' — ');

      await rateShop(shopId, {
        rating,
        comment: fullComment,
        bookingId,
      });

      setSubmitted(true);
      if (onSubmitted) onSubmitted(rating);
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="page-enter"
        style={{
          background: 'var(--bg-surface, #ffffff)',
          color: 'var(--text-primary, #111)',
          border: '1px solid var(--bg-border, #e5e7eb)',
          borderRadius: 'var(--radius-lg, 16px)',
          maxWidth: 440,
          width: '100%',
          padding: 24,
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '24px 8px' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Thank you for your rating!</h3>
            <p className="secondary" style={{ fontSize: 14, marginTop: 8 }}>
              Your feedback helps {shopName} keep their standards high on SnapCut.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--brand-primary-soft, #fee2e2)',
                  color: 'var(--brand-primary, #f0412b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  margin: '0 auto 12px auto',
                }}
              >
                ✂️
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Rate your cut</h2>
              <p className="secondary" style={{ fontSize: 13.5, marginTop: 4 }}>
                How was your service at <strong>{shopName}</strong>
                {serviceName ? ` for ${serviceName}` : ''}?
              </p>
            </div>

            {/* Stars Picker */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = star <= activeRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: 32,
                        cursor: 'pointer',
                        color: filled ? '#f59e0b' : '#d1d5db',
                        transform: filled ? 'scale(1.1)' : 'scale(1)',
                        transition: 'transform 0.15s ease, color 0.15s ease',
                        padding: 2,
                      }}
                      aria-label={`${star} star`}
                    >
                      ★
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', minHeight: 18 }}>
                {ratingLabels[activeRating] || ''}
              </div>
            </div>

            {/* Quick Tag Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {TAG_OPTIONS.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 99,
                      border: selected ? '1px solid var(--brand-primary, #f0412b)' : '1px solid var(--bg-border, #e5e7eb)',
                      background: selected ? 'var(--brand-primary, #f0412b)' : 'var(--bg-elevated, #f9fafb)',
                      color: selected ? '#ffffff' : 'var(--text-primary, #111)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Optional Comment */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                Notes or Barber Shoutout (optional)
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="He took his time with the beard and lined it up razor sharp..."
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm, 8px)',
                  border: '1px solid var(--bg-border, #e5e7eb)',
                  background: 'var(--bg-elevated, #f9fafb)',
                  color: 'inherit',
                  fontSize: 13,
                  resize: 'none',
                  outline: 'none',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  fontSize: 12,
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: 'var(--brand-danger-soft, #fee2e2)',
                  color: 'var(--brand-danger, #dc2626)',
                }}
              >
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="btn-secondary"
                style={{ flex: 1, fontSize: 13 }}
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{ flex: 2, fontSize: 13 }}
              >
                {submitting ? 'Submitting…' : 'Submit Rating'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
