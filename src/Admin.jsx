import { useState, useEffect } from 'react';
import { Plus, Save, Upload, LogOut, Trash2 } from 'lucide-react';

export default function Admin() {
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [data, setData] = useState(null);
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // UI State
  const [activeTab, setActiveTab] = useState('menu'); // 'menu' or 'settings'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modals
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatNameUz, setNewCatNameUz] = useState('');

  const [showDishModal, setShowDishModal] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [dishForm, setDishForm] = useState({
    name: '', nameUz: '', description: '', descriptionUz: '', price: '', image: null
  });

  const [imagePreview, setImagePreview] = useState(null);

  // Fetch Data
  const fetchData = async () => {
    try {
      const res = await fetch('/api/menu');
      const json = await res.json();
      setData(json);
      if (json && Object.keys(json).length > 0 && !selectedCategory) {
        setSelectedCategory(Object.keys(json)[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const resData = await res.json();
      if (res.ok) {
        setToken(resData.token);
        localStorage.setItem('admin_token', resData.token);
      } else {
        setLoginError(resData.error);
      }
    } catch (err) {
      setLoginError('Server error');
    }
  };

  const logout = () => {
    setToken('');
    localStorage.removeItem('admin_token');
  };

  // Save Data
  const saveData = async (updatedData) => {
    setIsSaving(true);
    try {
      await fetch('/api/menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });
      setData(updatedData);
    } catch (err) {
      alert("Xato yuz berdi saqlashda!");
    } finally {
      setIsSaving(false);
    }
  };

  // Add Category
  const handleAddCategory = () => {
    if (!newCatName) return;
    const newData = { ...data };
    newData[newCatName] = {
      nameUz: newCatNameUz || newCatName,
      image: '/placeholder.png', // Default image
      dishes: []
    };
    saveData(newData);
    setShowCatModal(false);
    setSelectedCategory(newCatName);
    setNewCatName('');
    setNewCatNameUz('');
  };

  // Delete Category
  const handleDeleteCategory = (catName) => {
    if (confirm(`Rostdan ham "${catName}" kategoriyasini o'chirmoqchimisiz?`)) {
      const newData = { ...data };
      delete newData[catName];
      setSelectedCategory(Object.keys(newData)[0] || null);
      saveData(newData);
    }
  };

  // Handle Image Upload
  const handleImageUpload = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const resData = await res.json();
    return resData.url;
  };

  // Save Dish
  const handleSaveDish = async (e) => {
    e.preventDefault();
    let imageUrl = imagePreview || '/placeholder.png'; // keep old or placeholder
    
    // If a new file was selected
    if (dishForm.imageFile) {
      imageUrl = await handleImageUpload(dishForm.imageFile);
    }

    const newData = { ...data };
    const catData = newData[selectedCategory];

    const newDish = {
      id: editingDish?.id || `dish-${Date.now()}`,
      name: dishForm.name,
      nameUz: dishForm.nameUz,
      description: dishForm.description,
      descriptionUz: dishForm.descriptionUz,
      price: parseInt(dishForm.price) || 0,
      isNew: true
    };

    if (editingDish) {
      // Update
      const idx = catData.dishes.findIndex(d => d.id === editingDish.id);
      if (idx > -1) catData.dishes[idx] = newDish;
    } else {
      // Create
      catData.dishes.push(newDish);
    }

    // Since in this structure, Category has one main image, maybe they want to set category image?
    // User requested "menyu qo'shish, rasmi...". But wait, in our app, dishes don't have individual images! The category has one background image!
    // I will save the image URL to the Category if it was uploaded in the "Add Dish" or we need a separate Category Image uploader.
    // Let's add a separate button for Category Image to be clear.
    
    saveData(newData);
    setShowDishModal(false);
  };

  // Change Category Image
  const handleCatImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await handleImageUpload(file);
    const newData = { ...data };
    newData[selectedCategory].image = url;
    saveData(newData);
  };

  // Delete Dish
  const handleDeleteDish = (id) => {
    if (confirm("O'chirmoqchimisiz?")) {
      const newData = { ...data };
      newData[selectedCategory].dishes = newData[selectedCategory].dishes.filter(d => d.id !== id);
      saveData(newData);
    }
  };

  // Open Edit Dish Modal
  const openEditDish = (dish) => {
    setEditingDish(dish);
    setDishForm({
      name: dish.name, nameUz: dish.nameUz || '',
      description: dish.description, descriptionUz: dish.descriptionUz || '',
      price: dish.price, imageFile: null
    });
    setShowDishModal(true);
  };

  const openAddDish = () => {
    setEditingDish(null);
    setDishForm({ name: '', nameUz: '', description: '', descriptionUz: '', price: '', imageFile: null });
    setShowDishModal(true);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-sm border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Admin Panel</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              type="text" placeholder="Login" required
              value={username} onChange={e => setUsername(e.target.value)}
              className="px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-lime-500 focus:outline-none"
            />
            <input 
              type="password" placeholder="Parol" required
              value={password} onChange={e => setPassword(e.target.value)}
              className="px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-lime-500 focus:outline-none"
            />
            {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
            <button type="submit" className="bg-[#c4f042] text-black font-bold py-3 rounded-lg hover:bg-[#a8d235] transition-colors mt-2">
              Kirish
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-10 text-white">Yuklanmoqda...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex font-sans">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-5 border-b border-gray-700 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white tracking-wider">Cofa Lova</h1>
          <button onClick={logout} className="text-gray-400 hover:text-white" title="Chiqish"><LogOut size={18} /></button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="text-xs uppercase text-gray-500 font-bold mb-3 tracking-wider">Kategoriyalar</h3>
          <ul className="space-y-1">
            {Object.keys(data).map(cat => (
              <li key={cat}>
                <button 
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === cat ? 'bg-lime-500/20 text-[#c4f042]' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                >
                  {cat}
                </button>
              </li>
            ))}
          </ul>
          
          <button 
            onClick={() => setShowCatModal(true)}
            className="w-full mt-4 flex items-center gap-2 justify-center py-2 rounded-lg border border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-all text-sm font-medium"
          >
            <Plus size={16} /> Yangi Kategoriya
          </button>
        </div>
        
        <div className="p-4 border-t border-gray-700">
          <a href="/" target="_blank" className="block text-center text-sm text-[#c4f042] hover:underline">
            Saytga o'tish →
          </a>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-900">
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 shrink-0 bg-gray-900">
          <h2 className="text-lg font-semibold text-white">
            {selectedCategory || 'Kategoriya tanlang'}
          </h2>
          {isSaving && <span className="text-lime-500 text-sm animate-pulse flex items-center gap-2"><Save size={14} /> Saqlanmoqda...</span>}
        </header>

        {selectedCategory && (
          <div className="p-8 overflow-y-auto flex-1">
            
            {/* Category Settings */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-8 flex justify-between items-start">
              <div>
                <h3 className="text-white font-bold mb-1">Kategoriya sozlamalari</h3>
                <p className="text-gray-400 text-sm mb-4">Bu kategoriya uchun orqa fon rasmi (Full HD tavsiya etiladi)</p>
                <div className="flex items-center gap-4">
                  <img src={data[selectedCategory].image} alt="bg" className="w-24 h-16 object-cover rounded border border-gray-600" />
                  <label className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 text-sm transition-colors">
                    <Upload size={16} /> Rasm yuklash
                    <input type="file" className="hidden" accept="image/*" onChange={handleCatImageChange} />
                  </label>
                </div>
              </div>
              <button 
                onClick={() => handleDeleteCategory(selectedCategory)}
                className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
              >
                <Trash2 size={16} /> Kategoriyani o'chirish
              </button>
            </div>

            {/* Menu List */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Menyu ({data[selectedCategory].dishes.length})</h3>
              <button onClick={openAddDish} className="bg-[#c4f042] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#a8d235] transition-colors flex items-center gap-2 text-sm">
                <Plus size={16} /> Taom qo'shish
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data[selectedCategory].dishes.map(dish => (
                <div key={dish.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 relative group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white text-lg">{dish.name}</h4>
                    <span className="bg-lime-500/20 text-lime-400 text-xs font-bold px-2 py-1 rounded">{dish.price} so'm</span>
                  </div>
                  <p className="text-gray-400 text-xs mb-1">UZ: {dish.nameUz}</p>
                  <p className="text-gray-300 text-sm line-clamp-2 mt-2">{dish.description}</p>
                  
                  <div className="absolute top-0 right-0 bottom-0 left-0 bg-gray-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 rounded-xl backdrop-blur-sm">
                    <button onClick={() => openEditDish(dish)} className="bg-white text-black px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-200">Tahrirlash</button>
                    <button onClick={() => handleDeleteDish(dish.id)} className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-red-600">O'chirish</button>
                  </div>
                </div>
              ))}
              {data[selectedCategory].dishes.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500 border border-dashed border-gray-700 rounded-xl">
                  Bu kategoriyada hali taomlar yo'q
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ADD CATEGORY MODAL */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Yangi Kategoriya</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nomi (RU)</label>
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 focus:border-lime-500 outline-none" placeholder="Masalan: Кофе" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nomi (UZ)</label>
                <input value={newCatNameUz} onChange={e => setNewCatNameUz(e.target.value)} className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 focus:border-lime-500 outline-none" placeholder="Masalan: Qahva" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCatModal(false)} className="flex-1 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600">Bekor qilish</button>
              <button onClick={handleAddCategory} className="flex-1 py-2 text-black font-bold bg-[#c4f042] rounded-lg hover:bg-[#a8d235]">Qo'shish</button>
            </div>
          </div>
        </div>
      )}

      {/* DISH MODAL */}
      {showDishModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">{editingDish ? "Taomni tahrirlash" : "Yangi taom"}</h3>
            <form onSubmit={handleSaveDish} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nomi (RU) *</label>
                  <input required value={dishForm.name} onChange={e => setDishForm({...dishForm, name: e.target.value})} className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 focus:border-lime-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nomi (UZ) *</label>
                  <input required value={dishForm.nameUz} onChange={e => setDishForm({...dishForm, nameUz: e.target.value})} className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 focus:border-lime-500 outline-none text-sm" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tavsif (RU)</label>
                <textarea rows={2} value={dishForm.description} onChange={e => setDishForm({...dishForm, description: e.target.value})} className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 focus:border-lime-500 outline-none text-sm resize-none" />
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tavsif (UZ)</label>
                <textarea rows={2} value={dishForm.descriptionUz} onChange={e => setDishForm({...dishForm, descriptionUz: e.target.value})} className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 focus:border-lime-500 outline-none text-sm resize-none" />
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Narxi (so'm) *</label>
                <input required type="number" value={dishForm.price} onChange={e => setDishForm({...dishForm, price: e.target.value})} className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 focus:border-lime-500 outline-none text-sm" />
              </div>

              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setShowDishModal(false)} className="flex-1 py-2.5 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 font-medium">Bekor qilish</button>
                <button type="submit" className="flex-1 py-2.5 text-black font-bold bg-[#c4f042] rounded-lg hover:bg-[#a8d235]">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
