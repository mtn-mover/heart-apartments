export default function LocationMap() {
  const locations = [
    {
      name: 'HEART 1–4',
      query: 'Centralstrasse+4,+3800+Interlaken,+Switzerland',
    },
    {
      name: 'HEART 5',
      query: 'General-Guisan-Strasse+18,+3800+Interlaken,+Switzerland',
    },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {locations.map((loc) => (
        <div key={loc.name} className="text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">
            {loc.name}
          </h3>
          <iframe
            title={`Map - ${loc.name}`}
            src={`https://www.google.com/maps?q=${loc.query}&output=embed`}
            width="100%"
            height="300"
            className="rounded-2xl border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ))}
    </div>
  );
}
