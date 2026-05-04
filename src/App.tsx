import { useMemo, useState } from 'react';

type FoodItem = {
  id: number;
  name: string;
  category: string;
  description: string;
  rating: number;
};

const initialFood: FoodItem[] = [
  { id: 1, name: 'Nasi Guriang', category: 'Karbohidrat', description: 'Nasi gurih dengan bumbu khas Sindang 2.', rating: 4 },
  { id: 2, name: 'Sayur Asem', category: 'Sayuran', description: 'Sayur asem segar dan sehat.', rating: 3 },
  { id: 3, name: 'Ikan Bakar', category: 'Protein', description: 'Ikan segar bakar dengan sambal.', rating: 5 },
  { id: 4, name: 'Buah Potong', category: 'Buah', description: 'Buah segar sebagai pencuci mulut.', rating: 3 }
];

const categories = ['Karbohidrat', 'Sayuran', 'Protein', 'Buah'];

const schools = [
  'SDN Dermayu',
  'TK Gandasari',
  'Al Maadi',
  'Al Wasliyah',
  'MTS Al-Wasliyah',
  'SMP Al-Irsyad',
  'KB Ushafa',
  'TK Ushafa',
  'SD Al-Khoir',
  'SDN 1 Sindang',
  'SDN 2 Sindang',
  'SD Al-Irsyad',
  'SMA PGRI 2 Sindang'
];

function App() {
  const [foodList, setFoodList] = useState<FoodItem[]>(initialFood);
  const [activeTab, setActiveTab] = useState('Penilaian');
  const [selectedSchool, setSelectedSchool] = useState(schools[0]);

  const averageRating = useMemo(() => {
    const total = foodList.reduce((sum, item) => sum + item.rating, 0);
    return (total / foodList.length).toFixed(1);
  }, [foodList]);

  const distribution = useMemo(() => {
    const counts = categories.reduce<Record<string, number>>((acc, category) => {
      acc[category] = 0;
      return acc;
    }, {} as Record<string, number>);

    foodList.forEach((item) => {
      counts[item.category] += 1;
    });

    return counts;
  }, [foodList]);

  const categoryRating = useMemo(() => {
    const summary = categories.reduce<Record<string, { total: number; count: number }>>((acc, category) => {
      acc[category] = { total: 0, count: 0 };
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    foodList.forEach((item) => {
      summary[item.category].total += item.rating;
      summary[item.category].count += 1;
    });

    return categories.map((category) => ({
      category,
      average: summary[category].count > 0 ? summary[category].total / summary[category].count : 0
    }));
  }, [foodList]);

  const updateRating = (id: number, value: number) => {
    setFoodList((current) => current.map((item) => item.id === id ? { ...item, rating: value } : item));
  };

  return (
    <div className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">SPPG Sindang 2 Indramayu</p>
          <h1>Penilaian Makanan & Distribusi Gizi</h1>
          <p className="subtitle">Lihat rating makanan, evaluasi menu, dan distribusi kategori gizi.</p>
          <div className="school-select">
            <strong>Sekolah:</strong>
            <span>{selectedSchool}</span>
          </div>
        </div>
        <div className="hero-stats">
          <div>
            <span>{foodList.length}</span>
            <small>Menu Dievaluasi</small>
          </div>
          <div>
            <span>{averageRating}</span>
            <small>Rata-rata Rating</small>
          </div>
        </div>
      </header>

      <section className="school-list">
        <h2>Sekolah Terdaftar</h2>
        <div className="schools-grid">
          {schools.map((school) => (
            <button
              key={school}
              className={school === selectedSchool ? 'school-chip active' : 'school-chip'}
              onClick={() => setSelectedSchool(school)}
            >
              {school}
            </button>
          ))}
        </div>
      </section>

      <nav className="tabs">
        {['Penilaian', 'Rate', 'Distribusi'].map((tab) => (
          <button
            key={tab}
            className={tab === activeTab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main>
        {activeTab === 'Penilaian' && (
          <section className="panel">
            <h2>Daftar Menu Makanan</h2>
            <div className="cards-grid">
              {foodList.map((item) => (
                <article key={item.id} className="card">
                  <h3>{item.name}</h3>
                  <p className="category">{item.category}</p>
                  <p>{item.description}</p>
                  <div className="rating">Rating: <strong>{item.rating}/5</strong></div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'Rate' && (
          <section className="panel">
            <h2>Ubah Rating Menu</h2>
            <div className="cards-grid">
              {foodList.map((item) => (
                <article key={item.id} className="card">
                  <h3>{item.name}</h3>
                  <p className="category">{item.category}</p>
                  <div className="rate-control">
                    {Array.from({ length: 5 }, (_, index) => (
                      <button
                        key={index}
                        className={index < item.rating ? 'star active' : 'star'}
                        onClick={() => updateRating(item.id, index + 1)}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <p className="small">Klik untuk mengubah nilai rating.</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'Distribusi' && (
          <section className="panel">
            <h2>Distribusi Kategori Gizi</h2>
            <div className="distribution">
              {categories.map((category) => {
                const value = distribution[category] || 0;
                const width = `${(value / foodList.length) * 100}%`;
                return (
                  <div key={category} className="distribution-row">
                    <span>{category}</span>
                    <div className="bar-wrap">
                      <div className="bar" style={{ width }} />
                    </div>
                    <strong>{value}</strong>
                  </div>
                );
              })}
            </div>
            <div className="stats-grid">
              {categoryRating.map((item) => (
                <div key={item.category} className="stat-card">
                  <h3>{item.category}</h3>
                  <p>Rata-rata rating: <strong>{item.average.toFixed(1)}</strong></p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
