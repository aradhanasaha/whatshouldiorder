export default function LoadingScreen({ message }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-14 h-14 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-6" />
      <p className="text-gray-700 font-medium text-base">{message || 'Loading…'}</p>
      <p className="text-gray-400 text-sm mt-1">This may take a few seconds</p>
    </div>
  );
}
