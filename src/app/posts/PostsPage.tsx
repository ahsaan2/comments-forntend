'use client';
import { useEffect, useState } from 'react';

// ...existing code...
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
  authorName?: string; // Add authorName for initials
  createdAt?: string; // Needed for edit/delete logic
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
  // Comments state: { [postId]: Comment[] }
  const [comments, setComments] = useState<{ [postId: number]: Comment[] }>({});
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Store reply content per comment id and per post id
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyContentMap, setReplyContentMap] = useState<{ [key: string]: string }>({});
  const [activePostReplyId, setActivePostReplyId] = useState<number | null>(null);
  // Store username from localStorage (if logged in)
  const [username, setUsername] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editPostTitle, setEditPostTitle] = useState('');
  const [editPostContent, setEditPostContent] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUsername(localStorage.getItem('username'));
    }
  }, []);

  // New Post Form
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [creatingPost, setCreatingPost] = useState(false);

  // Helper: check if post is editable/deletable
  const canEditOrDeletePost = (post: Post & { createdAt?: string, authorName?: string }) => {
    if (!username || !post.authorName) return false;
    // Compare usernames case-insensitively for robustness
    if (post.authorName.toLowerCase() !== username.toLowerCase()) return false;
    if (!post.createdAt) return false;
    const created = new Date(post.createdAt);
    const now = new Date();
    return (now.getTime() - created.getTime()) <= 15 * 60 * 1000;
  };

  // Edit post handlers
  const handleEditPost = (post: any) => {
    setEditingPostId(post.id);
    setEditPostTitle(post.title);
    setEditPostContent(post.content);
  };

  const handleUpdatePost = async (postId: number) => {
    try {
      const res = await fetch(`http://localhost:3001/posts/${postId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editPostTitle, content: editPostContent }),
      });
      if (!res.ok) throw new Error('Failed to update post');
      setEditingPostId(null);
      await fetchPosts();
    } catch (err) {
      alert('Error updating post');
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await fetch(`http://localhost:3001/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete post');
      await fetchPosts();
    } catch (err) {
      alert('Error deleting post');
    }
  };
  const fetchPosts = async () => {
    try {
      const response = await fetch('http://localhost:3001/posts',{
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (!response.ok) throw new Error(`Error ${response.status}`);
      const data: Post[] = await response.json();
      console.log("Fetched posts:", data);
      setPosts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load posts.');
    } finally {
      setLoadingPosts(false);
    }
  };
// Fetch comments for a specific post
  const fetchComments = async (postId: number) => {
    // keep the state for the comments isolated to the current post only
    
    try {
      const res = await fetch(`http://localhost:3001/comments/post/${postId}`,{
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const flatComments: Comment[] = await res.json();
      console.log('Fetched comments for post', flatComments)
      const tree = buildCommentTree(flatComments);
      setComments(prev => ({ ...prev, [postId]: tree }));
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

    // State leakage issue: Sharing comments across multiple posts.
  // parentId can be number or null
  const handleSubmitReply = async (parentId: number | null, postId: number) => {
    const key = parentId !== null ? `c_${parentId}` : `p_${postId}`;
    const content = replyContentMap[key]?.trim();
    if (!content) return;

    try {
      const res = await fetch(`http://localhost:3001/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          parentId,
          authorId: 8,
          authorName: username || 'User',
          content,
        }),
      });

      if (!res.ok) throw new Error('Failed to post comment');
      setReplyContentMap(prev => ({ ...prev, [key]: '' }));
      setActiveReplyId(null);
      setActivePostReplyId(null);
      await fetchComments(postId);
    } catch (err) {
      console.error('Error posting reply:', err);
    }
  };

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) 
      return;
    alert("Creating post");
    setCreatingPost(true);
    try {
      const res = await fetch('http://localhost:3001/posts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          authorId: 8
        }),
      });

      if (!res.ok) throw new Error('Failed to create post');
      setNewTitle('');
      setNewContent('');
      await fetchPosts(); // Refresh posts
    } catch (err) {
      alert(err)
      console.error('Error creating post:', err);
    } finally {
      setCreatingPost(false);
    }
  };

  // Helper: check if comment is editable/deletable
  const canEditOrDeleteComment = (comment: Comment & { createdAt?: string, authorName?: string }) => {
    if (!username || !comment.authorName) return false;
    // Compare usernames case-insensitively for robustness
    if (comment.authorName.toLowerCase() !== username.toLowerCase()) return false;
    if (!comment.createdAt) return false;
    const created = new Date(comment.createdAt);
    const now = new Date();
    return (now.getTime() - created.getTime()) <= 15 * 60 * 1000;
  };

  // State for editing comments
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');

  // Edit comment handlers
  const handleEditComment = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content);
  };

  const handleUpdateComment = async (commentId: number, postId: number) => {
    try {
      const res = await fetch(`http://localhost:3001/comments/${commentId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editCommentContent }),
      });
      if (!res.ok) throw new Error('Failed to update comment');
      setEditingCommentId(null);
      await fetchComments(postId);
    } catch (err) {
      alert('Error updating comment');
    }
  };

  const handleDeleteComment = async (commentId: number, postId: number) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      const res = await fetch(`http://localhost:3001/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete comment');
      await fetchComments(postId);
    } catch (err) {
      alert('Error deleting comment');
    }
  };

  // Pass postId as prop to CommentNode for correct post context
  const CommentNode = ({ comment, postId }: { comment: Comment; postId: number }) => {
    const editable = canEditOrDeleteComment(comment);
    return (
      <div className="ml-4 mt-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">
            {comment.authorName
              ? comment.authorName
              : username
                ? username
                : 'U'}
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 w-full">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-800 mb-0">{comment.content}</p>
              {/* Edit/Delete buttons if allowed */}
              {editable && (
                <div className="flex gap-2 ml-2">
                  <button className="text-xs text-blue-600 hover:underline" onClick={() => handleEditComment(comment)}>Edit</button>
                  <button className="text-xs text-red-600 hover:underline" onClick={() => handleDeleteComment(comment.id, postId)}>Delete</button>
                </div>
              )}
            </div>
            {editingCommentId === comment.id && editable && (
              <div className="mb-2 mt-2">
                <textarea
                  className="w-full mb-2 p-2 border rounded text-sm"
                  value={editCommentContent}
                  onChange={e => setEditCommentContent(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs" onClick={() => handleUpdateComment(comment.id, postId)}>Update</button>
                  <button className="text-gray-500 hover:underline text-xs" onClick={() => setEditingCommentId(null)}>Cancel</button>
                </div>
              </div>
            )}
            <button
              className="text-xs text-blue-500 mt-2 hover:underline"
              aria-label={`Reply to comment ${comment.id}`}
              onClick={() => {
                setActiveReplyId(comment.id);
                setActivePostReplyId(null);
              }}
            >
              Reply
            </button>

            {activeReplyId === comment.id && (
              <div className="mt-2">
                <textarea
                  className="w-full p-2 border rounded text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 shadow-sm"
                  rows={2}
                  placeholder="Write a reply..."
                  value={replyContentMap[`c_${comment.id}`] || ""}
                  onChange={e => {
                    const value = e.target.value;
                    setReplyContentMap(prev => ({ ...prev, [`c_${comment.id}`]: value }));
                  }}
                />
                <div className="flex gap-2 mt-1">
                  <button
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    aria-label={`Submit reply to comment ${comment.id}`}
                    onClick={() => handleSubmitReply(comment.id, postId)}
                  >
                    Submit
                  </button>
                  <button
                    className="text-xs text-gray-500 hover:underline"
                    aria-label="Cancel reply"
                    onClick={() => {
                      setReplyContentMap(prev => ({ ...prev, [`c_${comment.id}`]: "" }));
                      setActiveReplyId(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {comment.children && Array.isArray(comment.children) && comment.children.length > 0 && (
              <div className="mt-2 pl-6 border-l-2 border-gray-200">
                {comment.children.map((child) => (
                  <CommentNode key={child.id} comment={child} postId={postId} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Posts</h1>

      {loadingPosts && <p className="text-gray-600">Loading posts...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      <div className="space-y-6">
        {posts.map((post: any) => {
          const editable = canEditOrDeletePost(post);
          return (
            <div key={post.id} className="bg-white p-5 rounded-2xl shadow-md transition">
              {editingPostId === post.id && editable ? (
                <div className="mb-4">
                  <input
                    className="w-full mb-2 p-2 border rounded text-base"
                    value={editPostTitle}
                    onChange={e => setEditPostTitle(e.target.value)}
                  />
                  <textarea
                    className="w-full mb-2 p-2 border rounded text-base"
                    value={editPostContent}
                    onChange={e => setEditPostContent(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={() => handleUpdatePost(post.id)}>Save</button>
                    <button className="text-gray-500 hover:underline" onClick={() => setEditingPostId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold text-blue-700">{post.title}</h2>
                  <p className="text-gray-700 mt-2">{post.content}</p>
                  {/* Edit/Delete buttons if allowed */}
                  {editable && (
                    <div className="flex gap-2 mt-2">
                      <button className="text-xs text-blue-600 hover:underline" onClick={() => handleEditPost(post)}>Edit</button>
                      <button className="text-xs text-red-600 hover:underline" onClick={() => handleDeletePost(post.id)}>Delete</button>
                    </div>
                  )}
                </>
              )}
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
                  ) : comments[post.id]?.length > 0 ? (
                    <>
                      {/* Post-level reply UI */}
                      {activePostReplyId === post.id && (
                        <div className="mb-4">
                          <textarea
                            className="w-full p-2 border rounded text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 shadow-sm"
                            rows={2}
                            placeholder="Write a reply to this post..."
                            value={replyContentMap[`p_${post.id}`] || ""}
                            onChange={e => {
                              const value = e.target.value;
                              setReplyContentMap(prev => ({ ...prev, [`p_${post.id}`]: value }));
                            }}
                          />
                          <div className="flex gap-2 mt-1">
                            <button
                              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                              aria-label={`Submit reply to post ${post.id}`}
                              onClick={() => handleSubmitReply(null, post.id)}
                            >
                              Submit
                            </button>
                            <button
                              className="text-xs text-gray-500 hover:underline"
                              aria-label="Cancel post reply"
                              onClick={() => {
                                setReplyContentMap(prev => ({ ...prev, [`p_${post.id}`]: "" }));
                                setActivePostReplyId(null);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      <button
                        className="mb-2 text-xs text-blue-600 hover:underline"
                        aria-label={`Reply to post ${post.id}`}
                        onClick={() => {
                          setActivePostReplyId(post.id);
                          setActiveReplyId(null);
                        }}
                      >
                        Reply to Post
                      </button>
                      {comments[post.id].map((comment) => (
                        <CommentNode key={comment.id} comment={comment} postId={post.id} />
                      ))}
                    </>
                  ) : (
                    <>
                      {/* Post-level reply UI even if no comments */}
                      {activePostReplyId === post.id && (
                        <div className="mb-4">
                          <textarea
                            className="w-full p-2 border rounded text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 shadow-sm"
                            rows={2}
                            placeholder="Write a reply to this post..."
                            value={replyContentMap[`p_${post.id}`] || ""}
                            onChange={e => {
                              const value = e.target.value;
                              setReplyContentMap(prev => ({ ...prev, [`p_${post.id}`]: value }));
                            }}
                          />
                          <div className="flex gap-2 mt-1">
                            <button
                              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                              aria-label={`Submit reply to post ${post.id}`}
                              onClick={() => handleSubmitReply(null, post.id)}
                            >
                              Submit
                            </button>
                            <button
                              className="text-xs text-gray-500 hover:underline"
                              aria-label="Cancel post reply"
                              onClick={() => {
                                setReplyContentMap(prev => ({ ...prev, [`p_${post.id}`]: "" }));
                                setActivePostReplyId(null);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      <button
                        className="mb-2 text-xs text-blue-600 hover:underline"
                        aria-label={`Reply to post ${post.id}`}
                        onClick={() => {
                          setActivePostReplyId(post.id);
                          setActiveReplyId(null);
                        }}
                      >
                        Reply to Post
                      </button>
                      <p className="text-sm text-gray-500">No comments found.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Post Form */}
      <div className="bg-white p-6 mt-10 rounded-2xl shadow-md max-w-2xl mx-auto">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Create New Post</h3>
        <input
          type="text"
          placeholder="Title"
          className="w-full mb-3 p-3 border rounded text-base bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 shadow-sm"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <textarea
          placeholder="Content"
          className="w-full mb-3 p-3 border rounded text-base bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 shadow-sm"
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
