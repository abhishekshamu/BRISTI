import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, HelpCircle } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface FAQ {
  _id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function Faqs() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchFaqs();
  }, [categoryFilter]);

  const fetchFaqs = async () => {
    try {
      const response = await api.get(`/faqs${categoryFilter !== 'all' ? `?category=${categoryFilter}` : ''}`);
      setFaqs(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    
    try {
      await api.delete(`/faqs/${id}`);
      toast.success('FAQ deleted successfully');
      fetchFaqs();
    } catch (error) {
      toast.error('Failed to delete FAQ');
    }
  };

  const categories = ['all', ...Array.from(new Set(faqs.map(f => f.category)))];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">FAQs</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage frequently asked questions</p>
        </div>
        <Link to="/faqs/create" className="admin-btn-primary py-2.5 px-4 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Add FAQ
        </Link>
      </div>

      {/* Filters */}
      <div className="admin-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="admin-input"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* FAQs list */}
      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredFaqs.map((faq) => (
              <div key={faq._id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <HelpCircle className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {faq.question}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {faq.answer}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Category: {faq.category}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            faq.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {faq.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Link
                      to={`/faqs/${faq._id}/edit`}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                    >
                      <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <button
                      onClick={() => handleDelete(faq._id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredFaqs.length === 0 && (
              <div className="text-center py-12">
                <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No FAQs found</p>
                <Link to="/faqs/create" className="admin-btn-primary mt-4 py-2 px-4 inline-flex items-center">
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first FAQ
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}