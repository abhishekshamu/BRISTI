import MediaLibrary from '../../components/media/MediaLibrary';
import PageShell from '../../components/ui/PageShell';

export default function MediaManager() {
  return (
    <PageShell
      title="Media Library"
      subtitle="Upload, organize, optimize and track every image on the storefront"
    >
      <MediaLibrary usage />
    </PageShell>
  );
}
