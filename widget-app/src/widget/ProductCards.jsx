import { useState } from 'react';
import { RiImageLine, RiArrowRightUpLine } from '@remixicon/react';
import { Carousel, CarouselItem } from '@/components/base/carousel/carousel';
import { cx } from '@/utils/cx';
import { proxiedImage } from '../lib/api';

function formatPrice(price, currency) {
  if (!price) return null;
  const p = String(price).trim();
  // Already carries a currency (v1 metadata returns "123 kr.").
  if (/[a-z€$£]/i.test(p)) return p;
  return `${p} ${currency || 'kr.'}`;
}

function ProductImage({ src, alt, ui }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-1 text-text-tertiary">
        <RiImageLine className="size-6" aria-hidden />
        <span className="text-caption-2-regular">{ui.imageUnavailable}</span>
      </div>
    );
  }
  return (
    <img
      src={proxiedImage(src)}
      alt={alt || ''}
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
    />
  );
}

function Card({ p, cfg, compact }) {
  const pc = cfg.messages.productCards;
  const price = pc.showPrice ? formatPrice(p.price, pc.priceCurrency) : null;
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        'group flex overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default',
        'transition-[border-color,box-shadow] duration-200 hover:border-border-button-hover hover:shadow-sm',
        'outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',
        compact ? 'flex-row items-center gap-3 p-2' : 'h-full flex-col'
      )}
    >
      <div className={cx('shrink-0 overflow-hidden bg-background-secondary-default', compact ? 'size-16 rounded-xl' : 'aspect-[4/5] w-full')}>
        <ProductImage src={p.image} alt={p.name} ui={cfg.ui} />
      </div>
      <div className={cx('flex min-w-0 flex-1 flex-col gap-1', compact ? 'pe-2' : 'p-3')}>
        <span className="line-clamp-2 text-body-medium text-text-primary">{p.name || cfg.ui.viewProduct}</span>
        <span className="mt-auto flex items-center justify-between gap-2">
          {price ? <span className="text-body-semibold text-text-primary tabular-nums">{price}</span> : <span />}
          <RiArrowRightUpLine className="size-4 shrink-0 text-foreground-icon-tertiary transition-colors group-hover:text-accent-600" aria-hidden />
        </span>
      </div>
    </a>
  );
}

export function ProductCards({ products, cfg }) {
  if (!products?.length) return null;
  const layout = cfg.messages.productCards.layout;

  if (layout === 'vertical' || products.length === 1) {
    return (
      <div className="flex flex-col gap-2">
        {products.map((p) => (
          <Card key={p.url} p={p} cfg={cfg} compact />
        ))}
      </div>
    );
  }
  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {products.map((p) => (
          <Card key={p.url} p={p} cfg={cfg} />
        ))}
      </div>
    );
  }
  return (
    <Carousel aria-label={cfg.ui.products} gap={8} showDots={products.length > 2} className="-me-4">
      {products.map((p) => (
        <CarouselItem key={p.url} className="w-[46%] min-w-[150px] max-w-[190px]">
          <Card p={p} cfg={cfg} />
        </CarouselItem>
      ))}
    </Carousel>
  );
}
