export default function RouteSelector({ routes, selectedId, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {routes.map((route) => {
        const isActive = route.id === selectedId;
        return (
          <button
            key={route.id}
            onClick={() => onSelect(route.id)}
            className={[
              'px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 border',
              isActive
                ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-200',
            ].join(' ')}
          >
            {route.name}
          </button>
        );
      })}
    </div>
  );
}
