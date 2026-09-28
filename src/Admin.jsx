import { useState, useEffect } from 'react';
import { Plus, Save, LogOut, Trash2, ImagePlus, X, Menu } from 'lucide-react';

function ImageUploadZone({ file, existingUrl, onChange, onClear, label }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onChange(e.dataTransfer.files[0]);
    }
  };

  const previewSrc = file ? URL.createObjectURL(file) : existingUrl;

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClear) onClear();
  };

  return (
    <div>
      {label && <label className="block text-xs text-gray-400 mb-1">{label}</label>}
      <label 
        className={`relative flex flex-col items-center justify-center w-full h-32 md:h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all overflow-hidden group ${
          isDragging ? 'border-[#c4f042] bg-[#c4f042]/10' : 'border-gray-600 hover:border-gray-400 bg-gray-900/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {previewSrc && (
          <>
            <img src={previewSrc} alt="preview" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-30 transition-opacity" />
            <button 
              onClick={handleClear} 
              type="button" 
              className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white p-1.5 rounded-full backdrop-blur-md transition-colors z-20"
              title="Rasmni o'chirish"
            >
              <X size={16} />
            </button>
          </>
        )}
        
        <div className="flex flex-col items-center justify-center relative z-10 p-4 text-center drop-shadow-md">
          <ImagePlus className={`w-6 h-6 md:w-8 md:h-8 mb-2 transition-colors ${isDragging ? 'text-[#c4f042]' : 'text-gray-400 group-hover:text-white'}`} strokeWidth={1.5} />
          <p className="mb-1 text-xs md:text-sm text-gray-200 font-semibold text-shadow-sm">
            {file ? "Yangi rasm tanlandi" : previewSrc ? "Rasmni o'zgartirish" : "Rasm yuklash"}
          </p>
          <p className="text-[10px] md:text-xs text-gray-400 font-medium">Bu yerga tashlang yoki bosing</p>
        </div>
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) onChange(e.target.files[0]);
          }} 
        />
      </label>
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [data, setData] = useState(null);
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // UI State
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatNameUz, setNewCatNameUz] = useState('');

  const [showDishModal, setShowDishModal] = useState(false);
  const [editingDish, setEditingDish] = useState(null);
  const [dishForm, setDishForm] = useState({
    name: '', nameUz: '', description: '', descriptionUz: '', price: '', imageFile: null
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

  // Add Category
  const handleAddCategory = async () => {
    if (!newCatName) return;
    const newData = { ...data };
    newData[newCatName] = {
      nameUz: newCatNameUz || newCatName,
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
      setIsSidebarOpen(false);
    }
  };

  // Save Dish
  const handleSaveDish = async (e) => {
    e.preventDefault();
    let imageUrl = imagePreview || ''; 
    
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
      image: imageUrl,
      isNew: true
    };

    if (editingDish) {
      const idx = catData.dishes.findIndex(d => d.id === editingDish.id);
      if (idx > -1) catData.dishes[idx] = newDish;
    } else {
      catData.dishes.push(newDish);
    }
    
    saveData(newData);
    setShowDishModal(false);
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
    setImagePreview(dish.image || null);
    setShowDishModal(true);
  };

  const openAddDish = () => {
    setEditingDish(null);
    setDishForm({ name: '', nameUz: '', description: '', descriptionUz: '', price: '', imageFile: null });
    setImagePreview(null);
    setShowDishModal(true);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6 text-center tracking-wide">Admin Panel</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              type="text" placeholder="Login" required
              value={username} onChange={e => setUsername(e.target.value)}
              className="px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-[#c4f042] focus:outline-none transition-colors"
            />
            <input 
              type="password" placeholder="Parol" required
              value={password} onChange={e => setPassword(e.target.value)}
              className="px-4 py-3 bg-gray-900 text-white rounded-lg border border-gray-700 focus:border-[#c4f042] focus:outline-none transition-colors"
            />
            {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
            <button type="submit" className="bg-[#c4f042] text-black font-bold py-3.5 rounded-lg hover:bg-[#a8d235] transition-colors mt-2 shadow-lg shadow-[#c4f042]/20">
              Tizimga kirish
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return <div className="min-h-screen bg-gray-900 flex items-center justify-center p-10 text-white text-lg animate-pulse">Yuklanmoqda...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex font-sans overflow-hidden relative">
      
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 md:w-72 bg-gray-800 border-r border-gray-700 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 px-5 border-b border-gray-700 flex justify-between items-center shrink-0">
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-wider italic">Cofa Lova</h1>
          <button onClick={logout} className="text-gray-400 hover:text-white transition-colors" title="Chiqish"><LogOut size={20} /></button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
          <h3 className="text-xs uppercase text-gray-500 font-bold mb-3 tracking-wider px-1">Kategoriyalar</h3>
          <ul className="space-y-1.5">
            {Object.keys(data).map(cat => (
              <li key={cat}>
                <button 
                  onClick={() => {
                    setSelectedCategory(cat);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${selectedCategory === cat ? 'bg-[#c4f042]/10 border border-[#c4f042]/20 text-[#c4f042]' : 'text-gray-300 hover:bg-gray-700 hover:text-white border border-transparent'}`}
                >
                  {cat}
                </button>
              </li>
            ))}
          </ul>
          
          <button 
            onClick={() => {
              setNewCatName('');
              setNewCatNameUz('');
              setShowCatModal(true);
              setIsSidebarOpen(false);
            }}
            className="w-full mt-6 flex items-center gap-2 justify-center py-2.5 rounded-xl border border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 hover:bg-gray-800 transition-all text-sm font-medium"
          >
            <Plus size={18} /> Yangi Kategoriya
          </button>
        </div>
        
        <div className="p-4 border-t border-gray-700 shrink-0">
          <a href="/" target="_blank" className="block text-center text-sm font-medium text-[#c4f042] hover:underline bg-[#c4f042]/10 py-2.5 rounded-xl">
            Saytni ko'rish →
          </a>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-900 w-full relative">
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-4 md:px-8 shrink-0 bg-gray-900/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="md:hidden text-gray-300 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-base md:text-xl font-bold text-white truncate max-w-[200px] sm:max-w-none">
              {selectedCategory || 'Kategoriya tanlang'}
            </h2>
          </div>
          <div className="flex items-center gap-3 md:gap-5">
            {isSaving && <span className="text-lime-400 text-xs md:text-sm animate-pulse flex items-center gap-1.5 font-medium"><Save size={16} /> Saqlanmoqda...</span>}
            {selectedCategory && (
              <button 
                onClick={() => handleDeleteCategory(selectedCategory)}
                className="text-red-400 hover:bg-red-500/10 px-3 py-1.5 md:py-2 rounded-lg transition-colors flex items-center gap-2 text-xs md:text-sm border border-transparent hover:border-red-500/20"
              >
                <Trash2 size={16} className="md:w-5 md:h-5" /> 
                <span className="hidden sm:inline">Kategoriyani o'chirish</span>
              </button>
            )}
          </div>
        </header>

        {selectedCategory && (
          <div className="p-4 md:p-8 overflow-y-auto flex-1 bg-gray-900/50">
            
            {/* Menu Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
              <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                Menyu <span className="text-sm font-medium text-gray-500 bg-gray-800 px-2.5 py-0.5 rounded-full">{data[selectedCategory].dishes.length}</span>
              </h3>
              <button onClick={openAddDish} className="w-full sm:w-auto bg-[#c4f042] text-black font-semibold px-5 py-2.5 rounded-xl hover:bg-[#a8d235] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#c4f042]/20">
                <Plus size={18} /> Taom qo'shish
              </button>
            </div>

            {/* Dish Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 pb-10">
              {data[selectedCategory].dishes.map(dish => (
                <div key={dish.id} className="bg-gray-800 p-4 md:p-5 rounded-2xl border border-gray-700/60 relative group flex gap-4 transition-all hover:border-gray-500 hover:shadow-xl hover:shadow-black/50">
                  {dish.image && (
                    <img src={dish.image} alt={dish.name} className="w-20 h-20 md:w-24 md:h-24 rounded-xl object-cover flex-shrink-0 border border-gray-700 bg-gray-900" />
                  )}
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex justify-between items-start mb-1.5 gap-2">
                      <h4 className="font-bold text-white text-[15px] md:text-base leading-tight truncate">{dish.name}</h4>
                    </div>
                    <span className="inline-block bg-lime-500/10 text-[#c4f042] text-[11px] font-bold px-2 py-0.5 rounded-md mb-2">{dish.price} so'm</span>
                    <p className="text-gray-400 text-[11px] md:text-xs mb-1.5 truncate">UZ: {dish.nameUz}</p>
                    <p className="text-gray-300 text-xs md:text-sm line-clamp-2 leading-relaxed opacity-80">{dish.description}</p>
                  </div>
                  
                  {/* Hover Actions Desktop */}
                  <div className="hidden md:flex absolute inset-0 bg-gray-900/80 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-3 rounded-2xl backdrop-blur-sm z-10">
                    <button onClick={() => openEditDish(dish)} className="bg-white text-black px-4 py-2 rounded-xl font-semibold text-sm hover:bg-gray-200 hover:scale-105 active:scale-95 transition-transform shadow-lg">Tahrirlash</button>
                    <button onClick={() => handleDeleteDish(dish.id)} className="bg-red-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-red-600 hover:scale-105 active:scale-95 transition-transform shadow-lg">O'chirish</button>
                  </div>

                  {/* Actions Mobile */}
                  <div className="md:hidden absolute top-2 right-2 flex flex-col gap-1 z-10">
                    <button onClick={() => openEditDish(dish)} className="bg-gray-700/80 hover:bg-gray-600 text-white p-1.5 rounded-md backdrop-blur-sm transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button onClick={() => handleDeleteDish(dish.id)} className="bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-md backdrop-blur-sm transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {data[selectedCategory].dishes.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center text-center py-20 px-4 border-2 border-dashed border-gray-700 rounded-3xl bg-gray-800/30">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Plus className="text-gray-500" size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-gray-300 mb-1">Hali taom qo'shilmagan</h4>
                  <p className="text-sm text-gray-500 max-w-sm">Ushbu kategoriyada hech qanday taom mavjud emas. Yangi taom qo'shish tugmasini bosib menyuni to'ldiring.</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ADD CATEGORY MODAL */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gray-800 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-700 animate-slideUp">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-6">Yangi Kategoriya</h3>
            <div className="space-y-4 md:space-y-5">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">Nomi (RU) *</label>
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full bg-gray-900/80 text-white border border-gray-700 rounded-xl px-4 py-3 focus:border-[#c4f042] focus:ring-1 focus:ring-[#c4f042] outline-none transition-all text-sm" placeholder="Masalan: Кофе" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">Nomi (UZ) *</label>
                <input value={newCatNameUz} onChange={e => setNewCatNameUz(e.target.value)} className="w-full bg-gray-900/80 text-white border border-gray-700 rounded-xl px-4 py-3 focus:border-[#c4f042] focus:ring-1 focus:ring-[#c4f042] outline-none transition-all text-sm" placeholder="Masalan: Qahva" />
              </div>
            </div>
            <div className="flex gap-3 md:gap-4 mt-8">
              <button onClick={() => setShowCatModal(false)} className="flex-1 py-3 text-gray-300 bg-gray-700 rounded-xl hover:bg-gray-600 font-semibold transition-colors">Bekor qilish</button>
              <button onClick={handleAddCategory} className="flex-1 py-3 text-black font-bold bg-[#c4f042] rounded-xl hover:bg-[#a8d235] hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[#c4f042]/20">Qo'shish</button>
            </div>
          </div>
        </div>
      )}

      {/* DISH MODAL */}
      {showDishModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-gray-800 p-5 md:p-8 rounded-3xl shadow-2xl w-full max-w-lg border border-gray-700 max-h-[90vh] overflow-y-auto no-scrollbar animate-slideUp">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-6">{editingDish ? "Taomni tahrirlash" : "Yangi taom"}</h3>
            <form onSubmit={handleSaveDish} className="space-y-4 md:space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">Nomi (RU) *</label>
                  <input required value={dishForm.name} onChange={e => setDishForm({...dishForm, name: e.target.value})} className="w-full bg-gray-900/80 text-white border border-gray-700 rounded-xl px-4 py-2.5 focus:border-[#c4f042] focus:ring-1 focus:ring-[#c4f042] outline-none text-sm transition-all" />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">Nomi (UZ) *</label>
                  <input required value={dishForm.nameUz} onChange={e => setDishForm({...dishForm, nameUz: e.target.value})} className="w-full bg-gray-900/80 text-white border border-gray-700 rounded-xl px-4 py-2.5 focus:border-[#c4f042] focus:ring-1 focus:ring-[#c4f042] outline-none text-sm transition-all" />
                </div>
              </div>
              
              <div>
                <label className="block text-[11px] text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">Tavsif (RU)</label>
                <textarea rows={2} value={dishForm.description} onChange={e => setDishForm({...dishForm, description: e.target.value})} className="w-full bg-gray-900/80 text-white border border-gray-700 rounded-xl px-4 py-2.5 focus:border-[#c4f042] focus:ring-1 focus:ring-[#c4f042] outline-none text-sm resize-none transition-all leading-relaxed" />
              </div>
              
              <div>
                <label className="block text-[11px] text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">Tavsif (UZ)</label>
                <textarea rows={2} value={dishForm.descriptionUz} onChange={e => setDishForm({...dishForm, descriptionUz: e.target.value})} className="w-full bg-gray-900/80 text-white border border-gray-700 rounded-xl px-4 py-2.5 focus:border-[#c4f042] focus:ring-1 focus:ring-[#c4f042] outline-none text-sm resize-none transition-all leading-relaxed" />
              </div>
              
              <div>
                <label className="block text-[11px] text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">Narxi (so'm) *</label>
                <input required type="number" value={dishForm.price} onChange={e => setDishForm({...dishForm, price: e.target.value})} className="w-full bg-gray-900/80 text-white border border-gray-700 rounded-xl px-4 py-3 focus:border-[#c4f042] focus:ring-1 focus:ring-[#c4f042] outline-none text-base font-semibold transition-all" />
              </div>

              <ImageUploadZone 
                label="Taom rasmi (ixtiyoriy, Savat uchun)" 
                file={dishForm.imageFile} 
                existingUrl={imagePreview}
                onChange={(file) => setDishForm({...dishForm, imageFile: file})} 
                onClear={() => {
                  setDishForm({...dishForm, imageFile: null});
                  setImagePreview(null);
                }}
              />

              <div className="flex gap-3 md:gap-4 mt-8 pt-2">
                <button type="button" onClick={() => setShowDishModal(false)} className="flex-1 py-3.5 text-gray-300 bg-gray-700 rounded-xl hover:bg-gray-600 font-semibold transition-colors">Bekor qilish</button>
                <button type="submit" className="flex-1 py-3.5 text-black font-bold bg-[#c4f042] rounded-xl hover:bg-[#a8d235] hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[#c4f042]/20">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
