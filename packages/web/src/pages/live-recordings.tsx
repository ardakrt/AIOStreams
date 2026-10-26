import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { BiPlay } from 'react-icons/bi';
import { Button } from '@aiostreams/ui/button';
import { toast } from 'sonner';
import { useSession } from '../lib/session';
import { formatLocale } from '../lib/i18n';
import { navigate, to } from '../lib/paths';
import { useLiveActions, useLiveRecords } from '../lib/live-tv/queries';

export function LiveRecordings() {
  const { user } = useSession();
  const canRecord = user.Policy?.EnableLiveTvManagement === true;
  const { recordings, timers } = useLiveRecords(true);
  const actions = useLiveActions();
  const fail = () => toast.error(t`The change could not be saved. Try again.`);
  return (
    <section className="space-y-8">
      {canRecord && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">
            <Trans>Scheduled recordings</Trans>
          </h2>
          {timers.error ? (
            <p role="alert">
              <Trans>Scheduled recordings could not be loaded.</Trans>
            </p>
          ) : timers.isLoading ? (
            <p role="status">
              <Trans>Loading…</Trans>
            </p>
          ) : !timers.data?.Items?.length ? (
            <p className="text-white/65">
              <Trans>No recordings are scheduled.</Trans>
            </p>
          ) : (
            <ul className="divide-y divide-white/10">
              {timers.data.Items.map((timer) => (
                <li
                  key={timer.Id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <h3 className="break-words font-medium">{timer.Name}</h3>
                    <p className="mt-1 text-sm text-white/65">
                      {timer.ChannelName} ·{' '}
                      {timer.StartDate &&
                        new Date(timer.StartDate).toLocaleString(
                          formatLocale()
                        )}
                    </p>
                  </div>
                  <Button
                    intent="gray-outline"
                    disabled={actions.cancel.isPending}
                    onClick={() =>
                      actions.cancel.mutate(timer, { onError: fail })
                    }
                  >
                    <Trans>Cancel recording</Trans>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">
          <Trans>Recordings</Trans>
        </h2>
        {recordings.isLoading ? (
          <p role="status">
            <Trans>Loading…</Trans>
          </p>
        ) : recordings.error ? (
          <p role="alert">
            <Trans>Recordings could not be loaded.</Trans>
          </p>
        ) : !recordings.data?.Items?.length ? (
          <p className="text-white/65">
            <Trans>No recordings yet.</Trans>
          </p>
        ) : (
          <ul className="divide-y divide-white/10">
            {recordings.data.Items.map((item) => (
              <li key={item.Id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-4 rounded-lg p-4 text-start hover:bg-white/5 focus-visible:outline"
                  onClick={() => navigate(to.play(item.Id!, ''))}
                >
                  <BiPlay aria-hidden className="h-7 w-7 shrink-0" />
                  <span className="min-w-0">
                    <span className="block break-words font-medium">
                      {item.Name}
                    </span>
                    <span className="text-sm text-white/65">
                      {item.ChannelName}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
