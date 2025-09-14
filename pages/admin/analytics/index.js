import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../../../components/admin/Layout';
import { 
  ChartBarIcon, 
  ClockIcon, 
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Analytics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedWidget, setSelectedWidget] = useState('all');
  const [widgets, setWidgets] = useState([]);

  // Fetch metrics data
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period: selectedPeriod,
        ...(selectedWidget !== 'all' && { widgetId: selectedWidget })
      });
      
      const response = await fetch(`/api/analytics/metrics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch widgets list
  const fetchWidgets = async () => {
    try {
      const response = await fetch('/api/admin/widgets');
      if (!response.ok) throw new Error('Failed to fetch widgets');
      
      const data = await response.json();
      setWidgets(data);
    } catch (err) {
      console.error('Error fetching widgets:', err);
    }
  };

  useEffect(() => {
    fetchWidgets();
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [selectedPeriod, selectedWidget]);

  // Chart configurations
  const conversationTrendChart = {
    labels: metrics?.dailyTrends?.map(day => {
      const date = new Date(day.date);
      return date.toLocaleDateString('da-DK', { month: 'short', day: 'numeric' });
    }) || [],
    datasets: [
      {
        label: 'Conversations',
        data: metrics?.dailyTrends?.map(day => day.conversations) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const hourlyDistributionChart = {
    labels: metrics?.hourlyDistribution?.map(hour => hour.hour) || [],
    datasets: [
      {
        label: 'Conversations',
        data: metrics?.hourlyDistribution?.map(hour => hour.count) || [],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
      },
    ],
  };

  const responseTimeChart = {
    labels: ['< 1s', '1-2s', '2-5s', '5-10s', '> 10s'],
    datasets: [
      {
        data: [30, 45, 20, 3, 2], // Placeholder data - would need to calculate from actual response times
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Analytics - Elva Agents</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Monitor your chat widget performance and user engagement</p>
          </div>
          
          {/* Filters */}
          <div className="flex space-x-4">
            <select
              value={selectedWidget}
              onChange={(e) => setSelectedWidget(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Widgets</option>
              {widgets.map(widget => (
                <option key={widget._id} value={widget._id}>
                  {widget.name}
                </option>
              ))}
            </select>
            
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Conversations"
            value={metrics?.metrics?.totalConversations || 0}
            icon={ChatBubbleLeftRightIcon}
            color="blue"
          />
          <MetricCard
            title="Active Conversations"
            value={metrics?.metrics?.activeConversations || 0}
            icon={UserGroupIcon}
            color="green"
          />
          <MetricCard
            title="Avg Response Time"
            value={`${metrics?.metrics?.avgResponseTime || 0}ms`}
            icon={ClockIcon}
            color="purple"
          />
          <MetricCard
            title="Avg Conversation Length"
            value={metrics?.metrics?.avgConversationLength || 0}
            icon={ChartBarIcon}
            color="orange"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversation Trends */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversation Trends</h3>
            <div className="h-64">
              <Line data={conversationTrendChart} options={chartOptions} />
            </div>
          </div>

          {/* Hourly Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Distribution</h3>
            <div className="h-64">
              <Bar data={hourlyDistributionChart} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Response Time Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Response Time Distribution</h3>
          <div className="h-64 flex justify-center">
            <div className="w-64 h-64">
              <Doughnut data={responseTimeChart} options={doughnutOptions} />
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Messages</span>
                <span className="font-semibold">{metrics?.metrics?.totalMessages || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completion Rate</span>
                <span className="font-semibold">
                  {metrics?.metrics?.totalConversations > 0 
                    ? Math.round((metrics?.metrics?.completedConversations / metrics?.metrics?.totalConversations) * 100)
                    : 0}%
                </span>
              </div>
              {metrics?.metrics?.avgSatisfaction && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Satisfaction</span>
                  <span className="font-semibold">{metrics?.metrics?.avgSatisfaction}/5</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Widget Performance</h3>
            {metrics?.widgetMetrics ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Widget Name</span>
                  <span className="font-semibold">{metrics?.widgetMetrics?.widgetName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="font-semibold">
                    {new Date(metrics?.widgetMetrics?.createdAt).toLocaleDateString('da-DK')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Conversations</span>
                  <span className="font-semibold">{metrics?.widgetMetrics?.totalConversations}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Select a specific widget to see performance details</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Export Data
              </button>
              <button className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                View Conversations
              </button>
              <button 
                onClick={fetchMetrics}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function MetricCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    orange: 'text-orange-600 bg-orange-100',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  return {
    props: {},
  }
}