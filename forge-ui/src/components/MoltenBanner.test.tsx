import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../theme/ThemeProvider.js';
import { MoltenBanner } from './MoltenBanner.js';

function renderBanner(): HTMLElement {
  const { container } = render(
    <ThemeProvider>
      <MoltenBanner />
    </ThemeProvider>,
  );
  return container;
}

describe('MoltenBanner', () => {
  it('should render nothing in the default theme', () => {
    expect(renderBanner()).toBeEmptyDOMElement();
  });

  it('should render the banner when the molten theme is stored', () => {
    localStorage.setItem('forge.theme', 'molten');
    expect(renderBanner().querySelector('svg')).toBeInTheDocument();
  });

  it('should be hidden from assistive tech as decoration', () => {
    localStorage.setItem('forge.theme', 'molten');
    expect(renderBanner().querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});
