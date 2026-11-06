// A template re-mounts on every navigation, so only the page content below the persistent
// layout (header + sidebar) animates. Keep it to a short opacity fade: the previous spring
// slide (y: 20, low damping) overshot and read as a jolt on every tab change.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className='animate-in fade-in-0 duration-150 ease-out motion-reduce:animate-none'>
      {children}
    </div>
  );
}
