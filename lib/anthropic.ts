import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic();

// Cheap/fast tier — the right fit for short extraction and short-copy
// drafting tasks where the organizer reviews/edits the result before saving.
export const AI_MODEL = 'claude-haiku-4-5';
