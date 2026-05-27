import { Loader2 } from 'lucide-react';

export function SkeletonLoader() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center pointer-events-auto"
      style={{
        background: 'rgba(15, 17, 23, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div
        className="p-8 rounded-2xl flex flex-col items-center justify-center max-w-sm w-full border border-white/10"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        }}
      >
        {/* Animated pulse layout mimics page content loading */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 w-16 h-16 rounded-full border border-core/20 animate-ping opacity-40" />
          <div className="w-12 h-12 rounded-full bg-core/10 flex items-center justify-center border border-core/30">
            <Loader2 className="w-6 h-6 text-core animate-spin" />
          </div>
        </div>

        <div className="space-y-3 w-full text-center">
          <div className="h-4 bg-white/10 rounded-md w-2/3 mx-auto animate-pulse" />
          <div className="h-3 bg-white/5 rounded-md w-1/2 mx-auto animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default SkeletonLoader;
