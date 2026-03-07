import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentsAPI } from '../../services/studentsAPI';
import './StudentsManagement.css';

function StudentsManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activityFilter, setActivityFilter] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, statusFilter, activityFilter]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await studentsAPI.getAll();
      setStudents(data.items || data || []);
    } catch (err) {
      console.error('Error loading students:', err);
      setError(err?.response?.data?.message || 'حدث خطأ أثناء تحميل الطلاب');
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...students];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((student) => student.status === statusFilter);
    }

    // Activity filter
    if (activityFilter === 'active') {
      filtered = filtered.filter((student) => {
        const lastActivity = new Date(student.lastActivity || 0);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return lastActivity > sevenDaysAgo;
      });
    } else if (activityFilter === 'inactive') {
      filtered = filtered.filter((student) => {
        const lastActivity = new Date(student.lastActivity || 0);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return lastActivity < thirtyDaysAgo;
      });
    }

    setFilteredStudents(filtered);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'لا يوجد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG');
  };

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <span className="status-badge active">نشط</span>;
    } else if (status === 'suspended') {
      return <span className="status-badge suspended">معلق</span>;
    }
    return <span className="status-badge">غير محدد</span>;
  };

  if (loading) {
    return (
      <div className="students-management">
        <div className="loading-container">
          <p>جاري تحميل الطلاب...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="students-management">
      <div className="page-header">
        <button onClick={() => navigate('/welcome')} className="back-btn" style={{ fontSize: '24px', padding: '8px 16px' }}>
          ←
        </button>
        <h1>إدارة الطلاب</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="management-content">
        {/* Filters */}
        <div className="filters-section">
          <div className="filters-row">
            <div className="search-box">
              <input
                type="text"
                placeholder="بحث بالاسم أو الإيميل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="suspended">معلق</option>
            </select>

            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">جميع الأنشطة</option>
              <option value="active">نشط (آخر 7 أيام)</option>
              <option value="inactive">غير نشط (أكثر من 30 يوم)</option>
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="students-table-container">
          <table className="students-table">
            <thead>
              <tr>
                <th>اسم الطالب</th>
                <th>الإيميل</th>
                <th>المستوى</th>
                <th>آخر نشاط</th>
                <th>حالة الحساب</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data">
                    لا يوجد طلاب
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id || student._id}>
                    <td>{student.name || 'غير محدد'}</td>
                    <td>{student.email || 'غير محدد'}</td>
                    <td>{student.level || 'غير محدد'}</td>
                    <td>{formatDate(student.lastActivity)}</td>
                    <td>{getStatusBadge(student.status)}</td>
                    <td>
                      <button
                        onClick={() => navigate(`/admin/students/${student.id || student._id}`)}
                        className="view-btn"
                      >
                        عرض الملف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="students-count">
          إجمالي الطلاب: {filteredStudents.length} من {students.length}
        </div>
      </div>
    </div>
  );
}

export default StudentsManagement;



