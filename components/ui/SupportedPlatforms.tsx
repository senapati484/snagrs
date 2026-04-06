'use client';

const platforms = [
  { name: 'YouTube', color: '#FF0000' },
  { name: 'Instagram', color: '#E1306C' },
  { name: 'TikTok', color: '#69C9D0' },
  { name: 'Twitter/X', color: '#1D9BF0' },
  { name: 'Reddit', color: '#FF4500' },
];

export function SupportedPlatforms() {
  return (
    <div className="flex items-center justify-start gap-4 overflow-x-auto pb-2 no-scrollbar">
      <span className="text-xs text-muted-foreground shrink-0">Works with</span>
      <div className="flex gap-3">
        {platforms.map((platform) => (
          <span
            key={platform.name}
            className="text-xs text-muted-foreground flex items-center gap-1.5 whitespace-nowrap"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: platform.color }}
            />
            {platform.name}
          </span>
        ))}
      </div>
    </div>
  );
}
