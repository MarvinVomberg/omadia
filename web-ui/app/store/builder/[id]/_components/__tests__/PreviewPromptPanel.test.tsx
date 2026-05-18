import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '../../../../../_lib/api';
import { PreviewPromptPanel } from '../PreviewPromptPanel';

/**
 * Issue #55 — PreviewPromptPanel vitest cases.
 *
 * Coverage:
 *   - Mount triggers a fetch and renders sections per kind
 *   - Token count + health label render
 *   - Aktualisieren button refetches
 *   - Bumping `refetchKey` refetches
 *   - API error surfaces inline alert
 */

describe('<PreviewPromptPanel />', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(api, 'fetchBuilderPreviewPrompt');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches on mount and renders all sections by kind', async () => {
    fetchSpy.mockResolvedValueOnce({
      systemPrompt: '# Hi\n\n---\n\n<persona>...</persona>',
      tokens: 124,
      sections: [
        { label: 'Header', content: '# Hi', kind: 'header' },
        { label: 'Persona', content: '<persona>...</persona>', kind: 'persona' },
        { label: 'Sycophancy Guard', content: '## Critical Thinking', kind: 'sycophancy' },
      ],
    });
    render(<PreviewPromptPanel draftId="draft-1" />);
    await waitFor(() => {
      expect(screen.getByTestId('preview-prompt-section-header')).toBeInTheDocument();
    });
    expect(screen.getByTestId('preview-prompt-section-persona')).toBeInTheDocument();
    expect(screen.getByTestId('preview-prompt-section-sycophancy')).toBeInTheDocument();
    expect(screen.getByTestId('preview-prompt-tokens')).toHaveTextContent('124 Tokens');
  });

  it('Aktualisieren button refetches the prompt', async () => {
    fetchSpy.mockResolvedValue({
      systemPrompt: '# Hi',
      tokens: 1,
      sections: [{ label: 'Header', content: '# Hi', kind: 'header' }],
    });
    render(<PreviewPromptPanel draftId="draft-1" />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('preview-prompt-refresh'));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
  });

  it('bumping refetchKey refetches', async () => {
    fetchSpy.mockResolvedValue({
      systemPrompt: '# Hi',
      tokens: 1,
      sections: [{ label: 'Header', content: '# Hi', kind: 'header' }],
    });
    const { rerender } = render(<PreviewPromptPanel draftId="draft-1" refetchKey={0} />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    rerender(<PreviewPromptPanel draftId="draft-1" refetchKey={1} />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
  });

  it('renders inline alert when fetch fails', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('boom'));
    render(<PreviewPromptPanel draftId="draft-1" />);
    await waitFor(() => {
      expect(screen.getByTestId('preview-prompt-error')).toHaveTextContent('boom');
    });
  });

  it('token-health label tracks token thresholds', async () => {
    fetchSpy.mockResolvedValueOnce({
      systemPrompt: 'x'.repeat(10),
      tokens: 1500,
      sections: [{ label: 'Header', content: '# Hi', kind: 'header' }],
    });
    render(<PreviewPromptPanel draftId="draft-1" />);
    await waitFor(() => {
      expect(screen.getByTestId('preview-prompt-tokens')).toHaveTextContent('gut');
    });
  });
});
