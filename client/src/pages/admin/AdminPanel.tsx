import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, BookOpen, ChevronDown, Layers, Package, ShoppingCart, Users } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../utils/api';

function slugify(text: string) {
  return text.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
}

const CustomSelect = ({ value, onChange, options, placeholder, required }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedOption = options.find((o: any) => o.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="input-field w-full flex justify-between items-center cursor-pointer bg-surface h-[42px] select-none"
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
      >
        <span className={selectedOption ? 'text-textPrimary' : 'text-textSecondary'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={18} className={`text-textSecondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Hidden native input for required validation if needed */}
      {required && <input type="hidden" required value={value} />}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-divider rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
          {options.map((option: any) => (
            <div
              key={option.value}
              className={`px-4 py-3 cursor-pointer hover:bg-muted transition-colors select-none ${value === option.value ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary' : 'text-textPrimary border-l-2 border-transparent'}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function AdminPanel() {
  const [tab, setTab] = useState<'books' | 'categories' | 'users' | 'orders'>('books');
  const [isEditing, setIsEditing] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-divider gap-4">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary tracking-tight">Admin Dashboard</h1>
          <p className="text-textSecondary text-sm mt-1">Manage your books, categories, users and inventory</p>
        </div>
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="btn-secondary text-danger hover:bg-danger/5 border-danger/20 font-semibold px-6 py-2 rounded-full transition-all"
        >
          Log Out
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!isEditing && (
          <motion.div
            key="stats-and-nav"
            initial={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 32, overflow: 'hidden' }}
            exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
          >
            <AdminStats />

            {/* Horizontal Nav */}
            <div className="flex gap-2 bg-surface p-1.5 rounded-xl border border-divider shadow-sm overflow-x-auto whitespace-nowrap w-full md:w-auto custom-scrollbar">
              <button
                onClick={() => setTab('books')}
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${tab === 'books' ? 'bg-primary text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-muted'}`}
              >
                Books
              </button>
              <button
                onClick={() => setTab('categories')}
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${tab === 'categories' ? 'bg-primary text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-muted'}`}
              >
                Categories
              </button>
              <button
                onClick={() => setTab('users')}
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${tab === 'users' ? 'bg-primary text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-muted'}`}
              >
                Users
              </button>
              <button
                onClick={() => setTab('orders')}
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all ${tab === 'orders' ? 'bg-primary text-white shadow' : 'text-textSecondary hover:text-textPrimary hover:bg-muted'}`}
              >
                Orders
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {tab === 'books' && <BooksManager onEditingChange={setIsEditing} />}
      {tab === 'categories' && <CategoriesManager onEditingChange={setIsEditing} />}
      {tab === 'users' && <UsersManager onEditingChange={setIsEditing} />}
      {tab === 'orders' && <OrdersManager onEditingChange={setIsEditing} />}
    </div>
  );
}

// -------------------------------------------------------------
// Admin Stats Component
// -------------------------------------------------------------
function AdminStats() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/admin/stats`, { credentials: 'include' });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-divider shadow-sm flex items-center gap-4 bg-surface h-[82px] animate-pulse">
            <div className="w-12 h-12 rounded-lg bg-muted/40"></div>
            <div className="flex-1">
              <div className="h-3 bg-muted/40 rounded w-1/2 mb-2"></div>
              <div className="h-6 bg-muted/40 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    { title: 'Total Books', value: stats.totalBooks, icon: <BookOpen className="text-blue-500" size={24} />, bg: 'bg-blue-500/10' },
    { title: 'Total Stock', value: stats.totalStock, icon: <Package className="text-green-500" size={24} />, bg: 'bg-green-500/10' },
    { title: 'Total Categories', value: stats.totalCategories, icon: <Layers className="text-purple-500" size={24} />, bg: 'bg-purple-500/10' },
    { title: 'Total Users', value: stats.totalUsers, icon: <Users className="text-orange-500" size={24} />, bg: 'bg-orange-500/10' },
    { title: 'Total Orders', value: stats.totalOrders, icon: <ShoppingCart className="text-indigo-500" size={24} />, bg: 'bg-indigo-500/10' },
    { title: 'Low Stock Alert', value: stats.lowStockBooks, icon: <AlertTriangle className="text-danger" size={24} />, bg: 'bg-danger/10', isAlert: stats.lowStockBooks > 0 }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      {statCards.map((stat, i) => (
        <div key={i} className={`p-4 rounded-xl border border-divider shadow-sm flex items-center gap-4 transition-all ${stat.isAlert ? 'bg-danger/5 border-danger/30' : 'bg-surface'}`}>
          <div className={`p-3 rounded-lg ${stat.bg}`}>
            {stat.icon}
          </div>
          <div>
            <p className="text-xs text-textSecondary font-semibold uppercase tracking-wider">{stat.title}</p>
            <p className={`text-2xl font-bold ${stat.isAlert ? 'text-danger' : 'text-textPrimary'}`}>{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// -------------------------------------------------------------
// Books Manager
// -------------------------------------------------------------
function BooksManager({ onEditingChange }: { onEditingChange?: (isEditing: boolean) => void }) {
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [publications, setPublications] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [currentBook, setCurrentBook] = useState<any>(null);
  const { showToast } = useToast();
  const { confirm } = useDialog();

  useEffect(() => {
    fetchBooks();
    fetchCategories();
    fetchPublications();
    onEditingChange?.(view !== 'list');
  }, [view, onEditingChange]);

  const fetchBooks = async () => {
    try {
      const res = await api.getBooks({ limit: 1000, noCache: true });
      setBooks(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.getCategories({ limit: 1000, noCache: true });
      setCategories(res.data || res);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPublications = async () => {
    try {
      const res = await api.getPublications();
      setPublications(res);
    } catch (e) {
      console.error(e);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newCats = [...categories];
    const temp = newCats[index];
    newCats[index] = newCats[index - 1];
    newCats[index - 1] = temp;
    setCategories(newCats);
    saveOrder(newCats);
  };

  const moveDown = (index: number) => {
    if (index === categories.length - 1) return;
    const newCats = [...categories];
    const temp = newCats[index];
    newCats[index] = newCats[index + 1];
    newCats[index + 1] = temp;
    setCategories(newCats);
    saveOrder(newCats);
  };

  const saveOrder = async (cats: any[]) => {
    try {
      await api.reorderCategories(cats.map(c => c.id));
      showToast('Category order saved', 'success');
    } catch (e) {
      showToast('Failed to save order', 'error');
    }
  };

  const deleteBook = async (id: string) => {
    const isConfirmed = await confirm({ title: 'Delete Book', message: 'Are you sure you want to delete this book? This action cannot be undone.', type: 'danger', confirmText: 'Delete' });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/admin/books/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete book');
      }
      showToast('Book deleted successfully', 'success');
      fetchBooks();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to delete book', 'error');
    }
  };

  const handleEdit = (book: any) => {
    setCurrentBook(book);
    setView('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const RowComponent = React.memo(({ index, style, ariaAttributes }: any) => {
    const b = books[index];
    if (!b) return null;
    return (
      <div {...ariaAttributes} style={style} className="flex items-center px-4 border-b border-divider hover:bg-muted/50 transition-colors">
        <div className="w-20 pr-4 flex items-center justify-center">
          {b.coverImage ? (
            <img src={b.coverImage} alt={b.title} className="w-14 h-20 object-cover rounded shadow-sm border border-divider" loading="lazy" />
          ) : (
            <div className="w-14 h-20 bg-muted rounded border border-divider flex items-center justify-center text-xs text-textSecondary text-center p-1">No Img</div>
          )}
        </div>
        <div className="flex-1 truncate pr-4 font-semibold text-textPrimary">{b.title}</div>
        <div className="w-32 text-sm text-textSecondary truncate">{b.author || '-'}</div>
        <div className="w-32">
          <span className="text-sm bg-muted text-textSecondary px-3 py-1 rounded-full font-medium truncate max-w-[120px] block">{b.category}</span>
        </div>
        <div className="w-40">
          <span className="text-xs text-textSecondary truncate max-w-[150px] block" title={b.publicationName || '-'}>
            {b.publicationName || '-'}
          </span>
        </div>
        <div className="w-28 font-medium flex flex-col justify-center">
          <span>₹{b.price}</span>
          {b.isOnSale && <span className="text-success text-[10px] ml-0 mt-1 bg-success/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider w-max">Sale</span>}
        </div>
        <div className="w-32 flex flex-col justify-center">
          <span className="font-bold text-textPrimary">{b.stock} units</span>
          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full w-max mt-1 ${b.stock === 0 ? 'bg-danger/10 text-danger' :
            b.stock <= 5 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
            }`}>
            {b.stock === 0 ? 'Out of Stock' : b.stock <= 5 ? 'Low Stock' : 'In Stock'}
          </span>
        </div>
        <div className="w-36 flex gap-2">
          <button onClick={() => handleEdit(b)} className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-xs font-bold transition-colors">Edit</button>
          <button onClick={() => deleteBook(b.id)} className="px-3 py-1.5 bg-danger/10 text-danger hover:bg-danger/20 rounded-md text-xs font-bold transition-colors">Delete</button>
        </div>
      </div>
    );
  });

  return (
    <AnimatePresence mode="wait">
      {view === 'list' && (
        <motion.div
          key="books-list"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="bg-surface rounded-xl overflow-hidden border border-divider shadow-sm"
        >
          <div className="p-4 border-b border-divider flex justify-between items-center bg-muted/30">
            <h2 className="text-xl font-bold">Books Directory</h2>
            <button onClick={() => { setCurrentBook(null); setView('add'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="btn-primary py-2 px-6 rounded-lg text-sm shadow-md">Add New Book</button>
          </div>
          <div className="overflow-x-auto w-full custom-scrollbar">
            <div className="min-w-[1000px]">
              <div className="flex items-center px-4 py-3 bg-muted/50 text-textSecondary font-semibold border-b border-divider text-sm tracking-wider uppercase">
                <div className="w-20 pr-4">Cover</div>
                <div className="flex-1">Title</div>
                <div className="w-32">Author</div>
                <div className="w-32">Category</div>
                <div className="w-40">Publications</div>
                <div className="w-28">Price</div>
                <div className="w-32">Stock</div>
                <div className="w-36">Actions</div>
              </div>
              {books.length > 0 ? (
                <div className="flex flex-col w-full max-h-[600px] overflow-y-auto custom-scrollbar">
                  {books.map((b, index) => (
                    <RowComponent key={b.id || index} index={index} ariaAttributes={{}} style={{ height: 100 }} />
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-textSecondary">No books found. Add one to get started.</div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {(view === 'add' || view === 'edit') && (
        <motion.div
          key="books-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.15 }}
        >
          <BookForm
            book={currentBook}
            categories={categories}
            publications={publications}
            onSave={() => setView('list')}
            onCancel={() => setView('list')}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BookForm({ book, categories, publications, onSave, onCancel }: any) {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: book?.title || '',
    slug: book?.slug || '',
    author: book?.author || '',
    isbn: book?.isbn || '',
    description: book?.description || '',
    categoryId: book?.categoryId || (categories.length > 0 ? categories[0].id : ''),
    price: book?.price || '',
    isOnSale: book?.isOnSale || false,
    oldPrice: book?.oldPrice || '',
    stock: book?.stock || 0,
    format: book?.format || 'Paperback',
    isTrending: book?.isTrending || false,
  });

  const [publicationIds, setPublicationIds] = useState<string[]>(
    book?.publications?.map((p: any) => p.id) || []
  );

  const [imageFile, setImageFile] = useState<File | null>(null);

  // Set default publication to Nilansu Publication if adding a new book
  useEffect(() => {
    if (!book && publications.length > 0 && publicationIds.length === 0) {
      const nilansuPub = publications.find((p: any) => p.name.toLowerCase().includes('nilansu') || p.slug.includes('nilansu'));
      if (nilansuPub) {
        setPublicationIds([nilansuPub.id]);
      }
    }
  }, [book, publications]);

  // Auto-generate slug
  useEffect(() => {
    if (!book) {
      setFormData(prev => ({ ...prev, slug: slugify(prev.title) }));
    }
  }, [formData.title, book]);

  // Set default category if none selected
  useEffect(() => {
    if (!formData.categoryId && categories.length > 0) {
      setFormData(prev => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
      showToast("Please select a valid category. If none exist, create one in the Categories tab first.", 'error');
      return;
    }
    
    setIsSaving(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, String(value));
    });

    // Add publicationIds array as JSON string
    data.append('publicationIds', JSON.stringify(publicationIds));

    if (imageFile) {
      data.append('image', imageFile);
    } else if (book?.coverImage) {
      data.append('coverImage', book.coverImage);
    }

    const url = book ? `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/admin/books/${book.id}` : `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/admin/books`;
    const method = book ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        body: data,
        credentials: 'include'
      });
      if (res.ok) {
        showToast(book ? 'Book updated successfully' : 'Book added successfully', 'success');
        onSave();
      } else {
        const errorData = await res.json();
        showToast(`Failed to save book: ${errorData.error || 'Unknown error'}`, 'error');
        setIsSaving(false);
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving book', 'error');
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface p-8 rounded-xl border border-divider shadow-sm w-full">
      <div className="flex justify-between items-center mb-6 border-b border-divider pb-4">
        <h2 className="text-2xl font-bold tracking-tight">{book ? 'Edit Book' : 'Add New Book'}</h2>
        <button type="button" onClick={onCancel} className="text-textSecondary hover:text-textPrimary font-semibold transition-colors">Cancel</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Basic Info */}
        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm mb-1.5 font-medium text-textSecondary">Title</label>
              <input required type="text" className="input-field w-full" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm mb-1.5 font-medium text-textSecondary">Slug (URL-friendly)</label>
              <input required type="text" className="input-field w-full bg-muted" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm mb-1.5 font-medium text-textSecondary">Author (Optional)</label>
              <input type="text" className="input-field w-full" value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm mb-1.5 font-medium text-textSecondary">ISBN (Optional)</label>
              <input type="text" className="input-field w-full" value={formData.isbn || ''} onChange={e => setFormData({ ...formData, isbn: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm mb-1.5 font-medium text-textSecondary">Category</label>
              <CustomSelect
                required
                value={formData.categoryId}
                onChange={(val: string) => setFormData({ ...formData, categoryId: val })}
                options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                placeholder="Select a Category..."
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5 font-medium text-textSecondary">Publications (Select one or more)</label>
              <div className="flex flex-wrap gap-4 mt-2">
                {publications.map((pub: any) => {
                  const isSelected = publicationIds.includes(pub.id);
                  return (
                    <button
                      key={pub.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setPublicationIds(publicationIds.filter(id => id !== pub.id));
                        } else {
                          setPublicationIds([...publicationIds, pub.id]);
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 border ${isSelected
                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105'
                        : 'bg-surface text-textSecondary border-divider hover:border-primary/50 hover:text-primary'
                        }`}
                    >
                      {pub.name}
                    </button>
                  );
                })}
              </div>
              {publicationIds.length === 0 && (
                <p className="text-danger text-xs mt-1">At least one publication must be selected.</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1.5 font-medium text-textSecondary">Description</label>
            <textarea rows={4} className="input-field w-full resize-y" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm mb-1.5 font-medium text-textSecondary">Cover Image</label>
            <div className="mt-1 flex items-center gap-4 p-4 border border-dashed border-divider rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
              <label className="cursor-pointer bg-primary/10 text-primary hover:bg-primary/20 px-5 py-2.5 rounded-lg font-bold transition-colors border border-primary/20 text-sm">
                Choose Image File
                <input type="file" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} accept="image/*" />
              </label>
              {imageFile ? (
                <div className="flex items-center gap-3 bg-surface p-2 rounded-lg border border-divider shadow-sm">
                  <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-12 h-16 object-cover rounded border border-divider" />
                  <span className="text-sm text-textPrimary font-medium max-w-[200px] truncate">{imageFile.name}</span>
                </div>
              ) : book?.coverImage ? (
                <div className="flex items-center gap-3 bg-surface p-2 rounded-lg border border-divider shadow-sm">
                  <img src={book.coverImage} alt="Current" className="w-12 h-16 object-cover rounded border border-divider" />
                  <span className="text-sm text-textSecondary font-medium">Current Image</span>
                </div>
              ) : (
                <span className="text-sm text-textSecondary italic">No file chosen</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Inventory */}
        <div className="flex flex-col gap-5">
          <div className="space-y-5 bg-muted/20 p-5 rounded-xl border border-divider flex-grow">
            <h3 className="font-semibold text-textPrimary border-b border-divider pb-2 mb-4">Pricing & Details</h3>

            <div className="flex items-center gap-2 bg-primary/5 p-3 rounded-lg border border-primary/10 mb-4">
              <input type="checkbox" id="onSale" className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary" checked={formData.isOnSale} onChange={e => setFormData({ ...formData, isOnSale: e.target.checked })} />
              <label htmlFor="onSale" className="text-sm font-bold text-primary select-none cursor-pointer">Mark as On Sale</label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1.5 font-medium text-textSecondary">{formData.isOnSale ? 'Sale Price (₹)' : 'Price (₹)'}</label>
                <input required type="number" min="0" step="0.01" className="input-field w-full" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
              </div>
              {formData.isOnSale && (
                <div>
                  <label className="block text-sm mb-1.5 font-medium text-textSecondary">Original Price</label>
                  <input required type="number" min="0" step="0.01" className="input-field w-full" value={formData.oldPrice} onChange={e => setFormData({ ...formData, oldPrice: e.target.value })} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1.5 font-medium text-textSecondary">Stock Quantity</label>
                <input required type="number" min="0" className="input-field w-full" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm mb-1.5 font-medium text-textSecondary">Format</label>
                <input required type="text" className="input-field w-full" value={formData.format} onChange={e => setFormData({ ...formData, format: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-divider mt-4">
              <input type="checkbox" id="trending" className="w-4 h-4 rounded" checked={formData.isTrending} onChange={e => setFormData({ ...formData, isTrending: e.target.checked })} />
              <label htmlFor="trending" className="text-sm font-medium text-textPrimary select-none cursor-pointer">Feature as Trending Book</label>
            </div>
          </div>

          <div className="p-5 border border-divider rounded-xl bg-surface flex flex-col gap-3 shadow-sm">
            <button type="submit" disabled={isSaving} className="btn-primary w-full py-3 shadow-md text-base disabled:opacity-80 flex justify-center items-center gap-2">
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Book Details'
              )}
            </button>
            <button type="button" onClick={onCancel} disabled={isSaving} className="btn-secondary w-full py-3 disabled:opacity-50">Cancel</button>
          </div>
        </div>
      </div>
    </form>
  );
}

// -------------------------------------------------------------
// Categories Manager
// -------------------------------------------------------------
function CategoriesManager({ onEditingChange }: { onEditingChange?: (isEditing: boolean) => void }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [currentCategory, setCurrentCategory] = useState<any>(null);
  const { showToast } = useToast();
  const { confirm } = useDialog();

  useEffect(() => {
    fetchCategories();
    onEditingChange?.(view !== 'list');
  }, [view, onEditingChange]);

  const fetchCategories = async () => {
    try {
      const res = await api.getCategories({ limit: 1000, noCache: true });
      setCategories(res.data || res);
    } catch (e) {
      console.error(e);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newCats = [...categories];
    const temp = newCats[index];
    newCats[index] = newCats[index - 1];
    newCats[index - 1] = temp;
    setCategories(newCats);
    saveOrder(newCats);
  };

  const moveDown = (index: number) => {
    if (index === categories.length - 1) return;
    const newCats = [...categories];
    const temp = newCats[index];
    newCats[index] = newCats[index + 1];
    newCats[index + 1] = temp;
    setCategories(newCats);
    saveOrder(newCats);
  };

  const saveOrder = async (cats: any[]) => {
    try {
      await api.reorderCategories(cats.map(c => c.id));
      showToast('Category order saved', 'success');
    } catch (e: any) {
      console.error(e);
      showToast(`Failed to save order: ${e.message}`, 'error');
    }
  };

  const deleteCategory = async (id: string) => {
    const isConfirmed = await confirm({ title: 'Delete Category', message: 'Are you sure you want to delete this category? Books mapped to this category will prevent deletion.', type: 'danger', confirmText: 'Delete' });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/admin/categories/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const data = await res.json();
        showToast(`Cannot delete: ${data.error}`, 'error');
        return;
      }
      showToast('Category deleted successfully', 'success');
      fetchCategories();
    } catch (e) {
      console.error(e);
      showToast('Failed to delete category', 'error');
    }
  };

  const handleEdit = (category: any) => {
    setCurrentCategory(category);
    setView('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence mode="wait">
      {view === 'list' && (
        <motion.div
          key="categories-list"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="bg-surface rounded-xl overflow-hidden border border-divider shadow-sm"
        >
          <div className="p-4 border-b border-divider flex justify-between items-center bg-muted/30">
            <h2 className="text-xl font-bold">Categories Directory</h2>
            <button onClick={() => { setCurrentCategory(null); setView('add'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="btn-primary py-2 px-6 rounded-lg text-sm shadow-md">Add New Category</button>
          </div>

          <div className="overflow-x-auto w-full custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-muted/50 border-b border-divider text-sm text-textSecondary uppercase tracking-wider">
                  <th className="p-4 font-semibold w-16 text-center">Order</th>
                  <th className="p-4 font-semibold">Image</th>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Slug</th>
                  <th className="p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-textSecondary">No categories found.</td>
                  </tr>
                ) : (
                  categories.map((c, index) => (
                    <tr key={c.id} className="border-b border-divider hover:bg-muted/50 transition-colors">
                      <td className="p-4 w-16 text-center">
                        <div className="flex flex-col items-center justify-center text-textSecondary">
                          <button
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                            className="p-1 hover:text-primary hover:bg-primary/10 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-textSecondary transition-colors"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveDown(index)}
                            disabled={index === categories.length - 1}
                            className="p-1 hover:text-primary hover:bg-primary/10 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-textSecondary transition-colors"
                          >
                            ▼
                          </button>
                        </div>
                      </td>
                      <td className="p-4 w-20">
                        {c.image_path ? (
                          <img src={c.image_path} alt={c.name} className="w-12 h-16 object-cover rounded shadow-sm border border-divider" loading="lazy" />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded border border-divider flex items-center justify-center text-[10px] text-textSecondary text-center leading-tight">No Img</div>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-textPrimary">{c.name}</td>
                      <td className="p-4 text-textSecondary text-sm font-mono bg-muted/30 rounded inline-block mt-4 ml-4 px-2 py-1">{c.slug}</td>
                      <td className="p-4">
                        <div className="flex gap-3">
                          <button onClick={() => handleEdit(c)} className="text-primary hover:text-primary/80 text-sm font-semibold transition-colors">Edit</button>
                          <button onClick={() => deleteCategory(c.id)} className="text-danger hover:text-danger/80 text-sm font-semibold transition-colors">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {(view === 'add' || view === 'edit') && (
        <motion.div
          key="categories-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.15 }}
        >
          <CategoryForm
            category={currentCategory}
            onSave={() => setView('list')}
            onCancel={() => setView('list')}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CategoryForm({ category, onCancel, onSave }: any) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(category?.image_path || null);
  const { showToast } = useToast();

  // Auto-generate slug
  useEffect(() => {
    if (!category) {
      setFormData(prev => ({ ...prev, slug: slugify(prev.name) }));
    }
  }, [formData.name, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, String(value));
    });

    if (imageFile) {
      data.append('image', imageFile);
    }

    const url = category ? `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/admin/categories/${category.id}` : `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/admin/categories`;
    const method = category ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        body: data,
        credentials: 'include'
      });
      if (res.ok) {
        showToast(category ? 'Category updated successfully' : 'Category created successfully', 'success');
        onSave();
      } else {
        const err = await res.json();
        showToast(`Failed to save category: ${err.error || 'Unknown error'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error saving category', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface p-8 rounded-xl border border-divider shadow-sm w-full">
      <div className="flex justify-between items-center mb-6 border-b border-divider pb-4">
        <h2 className="text-2xl font-bold tracking-tight">{category ? 'Edit Category' : 'Add New Category'}</h2>
        <button type="button" onClick={onCancel} className="text-textSecondary hover:text-textPrimary font-semibold transition-colors">Cancel</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm mb-1.5 font-medium text-textSecondary">Category Name</label>
              <input required type="text" className="input-field w-full text-lg font-medium" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Science Fiction" />
            </div>

            <div>
              <label className="block text-sm mb-1.5 font-medium text-textSecondary">URL Slug</label>
              <input required type="text" className="input-field w-full bg-muted font-mono text-sm" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} />
              <p className="text-xs text-textSecondary mt-1.5">This URL slug must be unique and is auto-generated based on the category name.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1.5 font-medium text-textSecondary">Description (Optional)</label>
            <textarea rows={3} className="input-field w-full resize-y" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description of the category..." />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1.5 font-medium text-textSecondary">Category Image</label>
          <div className="mt-1 flex flex-col sm:items-center gap-4 p-6 h-[calc(100%-24px)] border border-dashed border-divider rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors justify-center text-center">
            {imageFile ? (
              <div className="flex flex-col items-center gap-3">
                <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-[120px] h-[160px] object-cover rounded-xl border border-divider shadow-md" />
                <span className="text-sm text-textPrimary font-medium truncate">{imageFile.name}</span>
              </div>
            ) : category?.image_path ? (
              <div className="flex flex-col items-center gap-3">
                <img src={category.image_path} alt="Current" className="w-[120px] h-[160px] object-cover rounded-xl border border-divider shadow-md" />
                <span className="text-sm text-textSecondary font-medium">Current Image</span>
              </div>
            ) : (
              <div className="w-[120px] h-[160px] bg-surface rounded-xl border border-divider shadow-sm flex items-center justify-center text-textSecondary italic">
                No image
              </div>
            )}
            <label className="cursor-pointer bg-primary/10 text-primary hover:bg-primary/20 px-6 py-2.5 rounded-lg font-bold transition-colors border border-primary/20 text-sm inline-block mt-2 w-full sm:w-auto">
              Choose Image File
              <input type="file" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} accept="image/*" />
            </label>
          </div>
        </div>
      </div>

      <div className="pt-6 mt-6 border-t border-divider flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary px-6">Cancel</button>
        <button type="submit" className="btn-primary px-8 shadow-md">Save Category</button>
      </div>
    </form>
  );
}

// -------------------------------------------------------------
// Users Manager
// -------------------------------------------------------------
function UsersManager({ onEditingChange }: { onEditingChange?: (isEditing: boolean) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { showToast } = useToast();
  const { confirm } = useDialog();

  useEffect(() => {
    if (view === 'list') fetchUsers();
    onEditingChange?.(view !== 'list');
  }, [view, onEditingChange]);

  const fetchUsers = async () => {
    try {
      const res = await api.getAdminUsers();
      setUsers(Array.isArray(res) ? res : (res.data || res));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteUser = async (id: string) => {
    const isConfirmed = await confirm({ title: 'Delete User', message: 'Are you sure you want to delete this user? This action cannot be undone.', type: 'danger', confirmText: 'Delete' });
    if (!isConfirmed) return;
    try {
      await api.deleteAdminUser(id);
      showToast('User deleted successfully', 'success');
      fetchUsers();
    } catch (e: any) {
      showToast(e.message || 'Failed to delete user. They might have existing orders.', 'error');
      console.error(e);
    }
  };

  const handleEdit = (user: any) => {
    setCurrentUser(user);
    setView('edit');
  };

  const RowComponent = ({ index, style, ariaAttributes }: any) => {
    const u = users[index];
    if (!u) return null;
    return (
      <div {...ariaAttributes} style={style} className="flex items-center px-4 border-b border-divider hover:bg-muted/50 transition-colors">
        <div className="flex-1 truncate pr-4 font-semibold text-textPrimary">{u.name}</div>
        <div className="flex-1 truncate pr-4 text-textSecondary">{u.email}</div>
        <div className="w-32 font-medium">
          <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-surface border border-divider text-textSecondary'}`}>
            {u.role}
          </span>
        </div>
        <div className="w-40 text-sm text-textSecondary">{new Date(u.createdAt).toLocaleDateString()}</div>
        <div className="w-32 flex gap-3">
          <button onClick={() => handleEdit(u)} className="text-primary hover:text-primary/80 text-sm font-semibold transition-colors">Edit</button>
          <button onClick={() => deleteUser(u.id)} className="text-danger hover:text-danger/80 text-sm font-semibold transition-colors">Delete</button>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {view === 'list' && (
        <motion.div
          key="users-list"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="bg-surface rounded-xl overflow-hidden border border-divider shadow-sm"
        >
          <div className="p-4 border-b border-divider flex justify-between items-center bg-muted/30">
            <h2 className="text-xl font-bold">Users Directory</h2>
            <button onClick={() => { setCurrentUser(null); setView('add'); }} className="btn-primary py-2 px-6 rounded-lg text-sm shadow-md">Add New User</button>
          </div>
          <div className="overflow-x-auto w-full custom-scrollbar">
            <div className="min-w-[800px]">
              <div className="flex items-center px-4 py-3 bg-muted/50 text-textSecondary font-semibold border-b border-divider text-sm tracking-wider uppercase">
                <div className="flex-1">Name</div>
                <div className="flex-1">Email</div>
                <div className="w-32">Role</div>
                <div className="w-40">Joined</div>
                <div className="w-32">Actions</div>
              </div>
              {users.length > 0 ? (
                <div className="flex flex-col w-full max-h-[600px] overflow-y-auto custom-scrollbar">
                  {users.map((u, index) => (
                    <RowComponent key={u.id} index={index} ariaAttributes={{}} style={{ height: 60 }} />
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-textSecondary">No users found.</div>
              )}
            </div>
          </div>
        </motion.div>
      )}
      {(view === 'add' || view === 'edit') && (
        <motion.div
          key="users-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.15 }}
          className="max-w-2xl bg-surface rounded-xl border border-divider shadow-sm"
        >
          <UserForm
            user={currentUser}
            onSave={() => setView('list')}
            onCancel={() => setView('list')}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function UserForm({ user, onSave, onCancel }: { user: any, onSave: () => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'USER',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!user && !formData.password) {
      setError('Password is required for new users');
      setLoading(false);
      return;
    }

    try {
      if (user) {
        await api.updateAdminUser(user.id, formData);
        showToast('User updated successfully', 'success');
      } else {
        await api.createAdminUser(formData);
        showToast('User created successfully', 'success');
      }
      onSave();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-divider">
        <h2 className="text-2xl font-bold tracking-tight">{user ? 'Edit User' : 'Add New User'}</h2>
        <button type="button" onClick={onCancel} className="text-textSecondary hover:text-textPrimary font-semibold transition-colors">Cancel</button>
      </div>

      {error && <div className="mb-6 bg-danger/10 text-danger p-3 rounded-lg border border-danger/20 text-sm font-medium">{error}</div>}

      <div className="space-y-5">
        <div>
          <label className="block text-sm mb-1.5 font-medium text-textSecondary">Full Name</label>
          <input required type="text" className="input-field w-full" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm mb-1.5 font-medium text-textSecondary">Email Address</label>
          <input required type="email" className="input-field w-full" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm mb-1.5 font-medium text-textSecondary">Role</label>
          <CustomSelect
            value={formData.role}
            onChange={(val: string) => setFormData({ ...formData, role: val })}
            options={[
              { value: "USER", label: "Standard User" },
              { value: "ADMIN", label: "Administrator" }
            ]}
          />
        </div>

        <div>
          <label className="block text-sm mb-1.5 font-medium text-textSecondary">Password {user && <span className="text-xs text-textSecondary font-normal ml-2">(Leave blank to keep current)</span>}</label>
          <input type="password" minLength={6} className="input-field w-full" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={user ? "••••••••" : "Enter a secure password"} />
        </div>

        <div className="pt-6 border-t border-divider flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary px-6">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary px-8 shadow-md disabled:opacity-50">{loading ? 'Saving...' : 'Save User'}</button>
        </div>
      </div>
    </form>
  );
}

// -------------------------------------------------------------
// Orders Manager
// -------------------------------------------------------------
function OrdersManager({ onEditingChange }: { onEditingChange?: (isEditing: boolean) => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const { showToast } = useToast();
  const { confirm } = useDialog();

  useEffect(() => {
    fetchOrders();
    onEditingChange?.(false);
  }, [onEditingChange]);

  const fetchOrders = async () => {
    try {
      const res = await api.getAdminOrders();
      setOrders(Array.isArray(res) ? res : (res.data || res));
    } catch (e: any) {
      console.error(e);
      showToast('Failed to fetch orders', 'error');
    }
  };

  const deleteOrder = async (id: string) => {
    const isConfirmed = await confirm({ title: 'Delete Order', message: 'Are you sure you want to delete this order? This action cannot be undone.', type: 'danger', confirmText: 'Delete' });
    if (!isConfirmed) return;
    try {
      await api.deleteAdminOrder(id);
      showToast('Order deleted successfully', 'success');
      fetchOrders();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to delete order', 'error');
    }
  };

  const syncToShiprocket = async (id: string) => {
    setIsSyncing(id);
    try {
      await api.syncShiprocketOrder(id);
      showToast('Order synced to Shiprocket successfully', 'success');
      fetchOrders();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to sync with Shiprocket', 'error');
    } finally {
      setIsSyncing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return <span className="bg-success/10 text-success px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Success</span>;
      case 'Pending':
        return <span className="bg-warning/10 text-warning px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Pending</span>;
      case 'Failed':
        return <span className="bg-danger/10 text-danger px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Failed</span>;
      default:
        return <span className="bg-muted text-textSecondary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <div className="bg-surface rounded-xl overflow-hidden border border-divider shadow-sm">
      <div className="p-4 border-b border-divider flex justify-between items-center bg-muted/30">
        <h2 className="text-xl font-bold">Orders Directory</h2>
        <button onClick={fetchOrders} className="btn-secondary py-2 px-6 rounded-lg text-sm shadow-md">Refresh</button>
      </div>

      <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-muted/50 border-b border-divider text-sm text-textSecondary uppercase tracking-wider">
              <th className="p-4 font-semibold">Order ID / Date</th>
              <th className="p-4 font-semibold">Customer Details</th>
              <th className="p-4 font-semibold">Items</th>
              <th className="p-4 font-semibold">Amount</th>
              <th className="p-4 font-semibold">Status / Transaction</th>
              <th className="p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-textSecondary">No orders found.</td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-b border-divider hover:bg-muted/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-textPrimary text-sm">{o.orderNumber}</div>
                    <div className="text-xs text-textSecondary mt-1">{new Date(o.createdAt).toLocaleString()}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-textPrimary text-sm">{o.fullName} {o.user?.name ? `(${o.user.name})` : ''}</div>
                    <div className="text-xs text-textSecondary mt-1">{o.email}</div>
                    <div className="text-xs text-textSecondary mt-1">{o.phone}</div>
                  </td>
                  <td className="p-4">
                    <div className="max-w-[250px] space-y-2">
                      {o.items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3 text-xs text-textSecondary">
                          {item.book?.coverImage ? (
                            <img src={item.book.coverImage?.includes('uploaded_books') ? `${item.book.coverImage}?w=50` : item.book.coverImage} alt={item.book.title} className="w-8 h-10 object-cover rounded shadow-sm border border-divider flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-10 bg-muted rounded border border-divider flex items-center justify-center flex-shrink-0">
                              <BookOpen size={14} className="text-textSecondary/50" />
                            </div>
                          )}
                          <div className="flex-1 truncate">
                            {item.quantity}x <span className="font-medium text-textPrimary">{item.book?.title || 'Unknown Book'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-textPrimary">₹{o.finalAmount || o.total}</td>
                  <td className="p-4">
                    <div className="mb-2">
                      {o.paymentMethod === 'COD' ? (
                        <span className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mr-2">COD</span>
                      ) : (
                        <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mr-2">PREPAID</span>
                      )}
                      {getStatusBadge(o.status)}
                    </div>
                    {o.razorpayPaymentId && (
                      <div className="text-[10px] text-textSecondary font-mono bg-muted/30 p-1 rounded inline-block mt-1 block">
                        Txn: {o.razorpayPaymentId}
                      </div>
                    )}
                    
                    {/* Shiprocket Status */}
                    <div className="mt-2">
                      {o.shippingSyncStatus === 'CREATED' ? (
                        <div className="text-xs text-textSecondary flex flex-col gap-1">
                           <span className="text-success font-medium flex items-center gap-1"><Package size={12} /> Sync Success</span>
                           {o.shiprocketAwbCode && <span className="font-mono bg-muted/30 p-1 rounded">AWB: {o.shiprocketAwbCode}</span>}
                           {o.shiprocketStatus && <span className="text-primary font-bold">{o.shiprocketStatus}</span>}
                        </div>
                      ) : o.shippingSyncStatus === 'FAILED' ? (
                        <div className="text-[10px] text-danger mt-1 p-1 bg-danger/10 rounded">
                           Sync Failed: {o.shiprocketErrorMessage}
                        </div>
                      ) : (
                        <div className="text-[10px] text-warning mt-1">Not Synced</div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-2">
                      {(!o.shippingSyncStatus || o.shippingSyncStatus === 'FAILED' || o.shippingSyncStatus === 'PENDING') && (
                        <button
                          onClick={() => syncToShiprocket(o.id)}
                          disabled={isSyncing === o.id}
                          className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                          {isSyncing === o.id ? 'Syncing...' : 'Sync Shiprocket'}
                        </button>
                      )}
                      <button
                        onClick={() => deleteOrder(o.id)}
                        className="px-3 py-1.5 bg-danger/10 text-danger hover:bg-danger/20 rounded-md text-xs font-bold transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
