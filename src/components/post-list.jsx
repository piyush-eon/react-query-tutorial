import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {fetchPosts, fetchTags, addPost} from "../api/api";

function PostList() {
  const [page, setPage] = useState(1);

  const queryClient = useQueryClient();

  const {
    data: postData,
    isError,
    error,
    isLoading,
    isPlaceholderData,
  } = useQuery({
    queryKey: ["posts", {page}],
    queryFn: () => fetchPosts(page),
    // 👇 will run query every interval
    // refreshInterval: 1000 * 60,
    // 👇 Query runs when this is true
    // enabled: true,
    // 👇 while staletime lasts, it wont refetch on remount
    staleTime: 1000 * 60 * 5,
    // 👇 Dont allow caching
    // gcTime: 0,
    // 👇 keeps the last used data
    // placeholderData: (previousData) => previousData,,
  });

  const {data: tagsData, isLoading: isTagsLoading} = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
    // 👇 Since this wont change we dont want to refetch it
    staleTime: Infinity,
  });

  const {
    mutate,
    isPending,
    isError: isPostError,
    reset,
  } = useMutation({
    mutationFn: addPost,
    //👇 num of times it will retry before failing
    retry: 3,
    onMutate: async () => {
      // 👇 Can be used to cancel outgoing queries
      await queryClient.cancelQueries({queryKey: ["posts"], exact: true});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        // 👇 Invalidate queries with a key that starts with `posts`
        queryKey: ["posts", {page}],
        // 👇 invalidate exact query
        // exact: true,
        // 👇 invalidate specific query key/s
        // queryKey: ["todos", {page: 10}],
        // 👇 invalidate range of query keys
        // predicate: (query) => query.queryKey[0] === "posts" && query.queryKey[1].page >= 2,
      });

      // 👇 We can manually add to posts to avoid api calls
      //   queryClient.setQueryData(["posts"], (old) => [data, ...old]);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get("title");
    const tags = Array.from(formData.keys()).filter(
      (key) => formData.get(key) === "on"
    );

    if (!title || !tags) return;

    mutate({id: postData?.items + 1, title, tags});

    e.target.reset(); // reset form
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit}>
        {isPostError && <h5 onClick={() => reset()}>Unable to Post</h5>}
        <input
          type="text"
          placeholder="Enter your post.."
          className="postbox"
          name="title"
        />
        <div className="tags">
          {tagsData?.map((tag) => {
            return (
              <div key={tag}>
                <input name={tag} id={tag} type="checkbox" />
                <label htmlFor={tag}>{tag}</label>
              </div>
            );
          })}
        </div>
        <button disabled={isPending}>
          {isPending ? "Posting..." : "Post"}
        </button>
      </form>
      {isLoading && isTagsLoading && <p>Loading...</p>}
      {isError && <p>{error?.message}</p>}
      {postData?.data?.map((post) => {
        return (
          <div key={post.id} className="post">
            <div>{post.title}</div>
            {post.tags.map((tag) => {
              return <span key={tag}>{tag}</span>;
            })}
          </div>
        );
      })}

      {/* Pagination */}
      <div className="pages">
        <button
          onClick={() => setPage((old) => Math.max(old - 1, 0))}
          disabled={!postData?.prev}
        >
          Previous Page
        </button>
        <span>{page}</span>
        <button
          onClick={() => {
            if (!isPlaceholderData && postData?.next) {
              setPage((old) => old + 1);
            }
          }}
          // Disable the Next Page button until we know a next page is available
          disabled={isPlaceholderData || !postData?.next}
        >
          Next Page
        </button>
      </div>
    </div>
  );
}

export default PostList;
