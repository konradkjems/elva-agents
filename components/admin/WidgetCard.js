import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';

export default function WidgetCard({ widget }) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleEdit = () => {
    router.push(`/admin/widgets/${widget._id}`);
  };

  const handleToggleStatus = async () => {
    try {
      const response = await fetch(`/api/admin/widgets/${widget._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...widget,
          status: widget.status === 'active' ? 'inactive' : 'active'
        })
      });

      if (response.ok) {
        // Refresh the page or update the widget state
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to update widget status:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this widget?')) {
      try {
        const response = await fetch(`/api/admin/widgets/${widget._id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          window.location.reload();
        }
      } catch (error) {
        console.error('Failed to delete widget:', error);
      }
    }
  };

  const handleGetEmbedCode = () => {
    const embedCode = `<script src="${window.location.origin}/api/widget-embed/${widget._id}"></script>`;
    
    // Create a modal or use a simple prompt
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">🚀 Widget Embed Code</h3>
        <p class="text-sm text-gray-600 mb-4">
          Copy this code and add it to your website before the closing &lt;/body&gt; tag.
        </p>
        <div class="relative">
          <textarea
            readonly
            class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono resize-none"
            rows="3"
          >${embedCode}</textarea>
          <button
            onclick="navigator.clipboard.writeText('${embedCode}'); this.textContent='✅ Copied!'; setTimeout(() => this.textContent='📋 Copy', 2000)"
            class="absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
          >
            📋 Copy
          </button>
        </div>
        <div class="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <h4 class="font-medium text-green-900 mb-2">✅ Integration Steps:</h4>
          <ol class="text-sm text-green-800 space-y-1 list-decimal list-inside">
            <li>Copy the embed code above</li>
            <li>Paste it before the closing &lt;/body&gt; tag on your website</li>
            <li>Save and publish your website</li>
            <li>The chat widget will appear in the bottom-right corner</li>
          </ol>
        </div>
        <div class="mt-4 flex justify-end">
          <button
            onclick="this.closest('.fixed').remove()"
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {widget.name || 'Unnamed Widget'}
            </h3>
            <p className="text-sm text-gray-500 truncate">
              {widget.description || 'No description'}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center text-gray-400 hover:text-gray-600"
            >
              <EllipsisVerticalIcon className="h-5 w-5" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <button
                  onClick={handleEdit}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleGetEmbedCode}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <CodeBracketIcon className="h-4 w-4 mr-2" />
                  Get Embed Code
                </button>
                <button
                  onClick={handleToggleStatus}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  {widget.status === 'active' ? (
                    <>
                      <EyeSlashIcon className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <EyeIcon className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              widget.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {widget.status === 'active' ? 'Active' : 'Inactive'}
            </span>
            <span className="text-gray-500">
              {widget.analytics?.totalConversations || 0} conversations
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Messages:</span>
            <span className="ml-1 font-medium">{widget.analytics?.totalMessages || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Avg Response:</span>
            <span className="ml-1 font-medium">
              {widget.analytics?.averageResponseTime || 0}s
            </span>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleEdit}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Edit Widget
          </button>
        </div>
      </div>
    </div>
  );
}

