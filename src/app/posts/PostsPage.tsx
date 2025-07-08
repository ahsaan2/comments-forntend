'use client';
import { useEffect, useState } from 'react';

interface Post {
  id: number;
  title: string;
  content: string;
}

interface Comment {
  id: number;
  postId: number;
  parentId: number | null;
  content: string;
  children?: Comment[];
}

// Build nested comment tree
function buildCommentTree(comments: Comment[]): Comment[] {
  const map = new Map<number, Comment>();
  const roots: Comment[] = [];

  comments.forEach(comment => {
    map.set(comment.id, { ...comment, children: [] });
  });

  map.forEach(comment => {
    if (comment.parentId) {
      const parent = map.get(comment.parentId);
      if (parent) {
        parent.children!.push(comment);
      }
    } else {
      roots.push(comment);
    }
  });

  return roots;
}

const PostsPage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');

  // New Post Form
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [creatingPost, setCreatingPost] = useState(false);

  const fetchPosts = async () => {
    try {
      const response = await fetch('http://localhost:3001/posts');
      if (!response.ok) throw new Error(`Error ${response.status}`);
      const data: Post[] = await response.json();
      setPosts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load posts.');
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchComments = async (postId: number) => {
    try {
      const res = await fetch(`http://localhost:3001/comments/post/${postId}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const flatComments: Comment[] = await res.json();
      const tree = buildCommentTree(flatComments);
      setComments(tree);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleExpand = async (postId: number) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }

    setExpandedPostId(postId);
    setLoadingComments(true);
    await fetchComments(postId);
    setLoadingComments(false);
  };

  const handleSubmitReply = async (parentId: number) => {
    if (!replyContent.trim() || expandedPostId === null) return;

    try {
      const res = await fetch('http://localhost:3001/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: expandedPostId,
          parentId,
          content: replyContent.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to post comment');
      setReplyContent('');
      setActiveReplyId(null);
      await fetchComments(expandedPostId);
    } catch (err) {
      console.error('Error posting reply:', err);
    }
  };

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;

    setCreatingPost(true);
    try {
      const res = await fetch('http://localhost:3001/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to create post');
      setNewTitle('');
      setNewContent('');
      await fetchPosts(); // Refresh posts
    } catch (err) {
      console.error('Error creating post:', err);
    } finally {
      setCreatingPost(false);
    }
  };

  const CommentNode = ({ comment }: { comment: Comment }) => (
    <div className="ml-4 mt-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">
          {comment.id}
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 w-full">
          <p className="text-sm text-gray-800">{comment.content}</p>
          <button
            className="text-xs text-blue-500 mt-2 hover:underline"
            onClick={() => {
              setActiveReplyId(comment.id);
              setReplyContent('');
            }}
          >
            Reply
          </button>

          {activeReplyId === comment.id && (
            <div className="mt-2">
              <textarea
                className="w-full p-2 border rounded text-sm"
                rows={2}
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
              />
              <div className="flex gap-2 mt-1">
                <button
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  onClick={() => handleSubmitReply(comment.id)}
                >
                  Submit
                </button>
                <button
                  className="text-xs text-gray-500 hover:underline"
                  onClick={() => {
                    setReplyContent('');
                    setActiveReplyId(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {comment.children?.length > 0 && (
        <div className="mt-2 pl-6 border-l-2 border-gray-200">
          {comment.children.map((child) => (
            <CommentNode key={child.id} comment={child} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Posts</h1>

      {loadingPosts && <p className="text-gray-600">Loading posts...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="bg-white p-5 rounded-2xl shadow-md transition">
            <h2 className="text-2xl font-semibold text-blue-700">{post.title}</h2>
            <p className="text-gray-700 mt-2">{post.content}</p>

            <button
              className="mt-3 text-sm text-blue-500 hover:underline"
              onClick={() => handleExpand(post.id)}
            >
              {expandedPostId === post.id ? 'Hide Comments' : 'View Comments'}
            </button>

            {expandedPostId === post.id && (
              <div className="mt-5 border-t pt-4">
                {loadingComments ? (
                  <p className="text-sm text-gray-500">Loading comments...</p>
                ) : comments.length > 0 ? (
                  comments.map((comment) => (
                    <CommentNode key={comment.id} comment={comment} />
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No comments found.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New Post Form */}
      <div className="bg-white p-6 mt-10 rounded-2xl shadow-md max-w-2xl mx-auto">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Create New Post</h3>
        <input
          type="text"
          placeholder="Title"
          className="w-full mb-3 p-3 border rounded text-sm"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <textarea
          placeholder="Content"
          className="w-full mb-3 p-3 border rounded text-sm"
          rows={4}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
          onClick={handleCreatePost}
          disabled={creatingPost}
        >
          {creatingPost ? 'Creating...' : 'Create Post'}
        </button>
      </div>
    </div>
  );
};

export default PostsPage;
