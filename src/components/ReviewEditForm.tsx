'use client';

import { useState } from 'react';
import type {
  Review,
  ReviewStatus,
  ReviewType,
  AIProvider,
  AIModel,
  ReviewConfig,
} from '@/types';

interface ReviewEditFormProps {
  review: Review;
  onSave: (updatedReview: Partial<Review>, config?: ReviewConfig) => Promise<void>;
  onRetrigger: (config?: ReviewConfig) => Promise<void>;
  onCancel?: () => void;
}

const REVIEW_TYPES: { value: ReviewType; label: string; description: string }[] = [
  {
    value: 'comprehensive',
    label: 'Comprehensive',
    description: 'Full code review with all aspects',
  },
  {
    value: 'security',
    label: 'Security',
    description: 'Focus on security vulnerabilities',
  },
  {
    value: 'performance',
    label: 'Performance',
    description: 'Focus on performance optimizations',
  },
  {
    value: 'focused',
    label: 'Focused',
    description: 'Focus on specific areas',
  },
];

const AI_PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'azure-openai', label: 'Azure OpenAI' },
];

const AI_MODELS: Record<AIProvider, { value: AIModel; label: string }[]> = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku' },
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  ],
  'azure-openai': [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
  ],
};

const REVIEW_STATUSES: { value: ReviewStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'CHANGES_REQUESTED', label: 'Changes Requested' },
  { value: 'CLOSED', label: 'Closed' },
];

export default function ReviewEditForm({
  review,
  onSave,
  onRetrigger,
  onCancel,
}: ReviewEditFormProps) {
  const [title, setTitle] = useState(review.title);
  const [description, setDescription] = useState(review.description || '');
  const [status, setStatus] = useState<ReviewStatus>(review.status);
  const [reviewType, setReviewType] = useState<ReviewType>('comprehensive');
  const [aiProvider, setAiProvider] = useState<AIProvider>('openai');
  const [aiModel, setAiModel] = useState<AIModel>('gpt-4o');
  const [focusAreas, setFocusAreas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetriggering, setIsRetriggering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSave({
        title,
        description,
        status,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetrigger = async () => {
    setIsRetriggering(true);

    try {
      const config: ReviewConfig = {
        reviewType,
        aiProvider,
        aiModel,
        focusAreas: focusAreas
          ? focusAreas.split(',').map((area) => area.trim())
          : undefined,
      };

      await onRetrigger(config);
    } finally {
      setIsRetriggering(false);
    }
  };

  const availableModels = AI_MODELS[aiProvider];

  // Reset model when provider changes if current model is not available
  const handleProviderChange = (provider: AIProvider) => {
    setAiProvider(provider);
    const models = AI_MODELS[provider];
    if (!models.find((m) => m.value === aiModel)) {
      setAiModel(models[0].value);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-50">
        Edit Review
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ReviewStatus)}
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {REVIEW_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-700">
        <h3 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-50">
          Re-trigger Review
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          Re-run the AI review with updated configuration. This will create new review
          comments.
        </p>

        <div className="space-y-6">
          <div>
            <label
              htmlFor="reviewType"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
              Review Type
            </label>
            <select
              id="reviewType"
              value={reviewType}
              onChange={(e) => setReviewType(e.target.value as ReviewType)}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {REVIEW_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="aiProvider"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                AI Provider
              </label>
              <select
                id="aiProvider"
                value={aiProvider}
                onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {AI_PROVIDERS.map((provider) => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="aiModel"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                AI Model
              </label>
              <select
                id="aiModel"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value as AIModel)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableModels.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {reviewType === 'focused' && (
            <div>
              <label
                htmlFor="focusAreas"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Focus Areas (comma-separated)
              </label>
              <input
                type="text"
                id="focusAreas"
                value={focusAreas}
                onChange={(e) => setFocusAreas(e.target.value)}
                placeholder="e.g., error handling, performance, security"
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleRetrigger}
            disabled={isRetriggering || isSubmitting}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetriggering ? 'Re-triggering...' : 'Re-trigger Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
