import type { EventTimeLog, Log, LogPosition } from '@revoke.cash/core/events';
import { deduplicateArray, isNullish } from '@revoke.cash/core/utils';
import { type Address, getAddress, type Hex, pad, slice } from 'viem';

export const topicToAddress = (topic: Hex) => getAddress(slice(topic, 12));
export const addressToTopic = (address: Address) => pad(address, { size: 32 }).toLowerCase() as Hex;

export const selectorOf = (input: Hex | undefined): Hex | undefined => {
  if (isNullish(input) || input.length < 10) return undefined;
  return slice(input, 0, 4).toLowerCase() as Hex;
};

export const toEventTimeLog = (log: Log): EventTimeLog => ({
  transactionHash: log.transactionHash,
  blockNumber: log.blockNumber,
  transactionIndex: log.transactionIndex,
  logIndex: log.logIndex,
  timestamp: log.timestamp,
});

export const logSorterChronological = (a: LogPosition, b: LogPosition) => {
  if (a.blockNumber === b.blockNumber) {
    if (a.transactionIndex === b.transactionIndex) {
      return Number(a.logIndex - b.logIndex);
    }
    return Number(a.transactionIndex - b.transactionIndex);
  }
  return Number(a.blockNumber - b.blockNumber);
};

export const sortLogsChronologically = (logs: Log[]) => logs.sort(logSorterChronological);

export const sortTokenEventsChronologically = <T extends { time: LogPosition }>(events: T[]): T[] =>
  events.sort((a, b) => logSorterChronological(a.time, b.time));

export const deduplicateLogsByTopics = (logs: Log[], consideredIndexes: Array<0 | 1 | 2 | 3> = [0, 1, 2, 3]) => {
  const keyGenerator = (log: Log) => {
    const topicsKey = log.topics
      .map((topic, index) => (consideredIndexes.includes(index as 0 | 1 | 2 | 3) ? topic : 'ignored'))
      .join('-');

    return `${log.address}-${topicsKey}`;
  };

  return deduplicateArray(logs, keyGenerator);
};

export const filterLogsByAddress = (logs: Log[], address: string) => {
  return logs.filter((log) => log.address === address);
};

export const filterLogsByTopics = (logs: Log[], topics: string[]) => {
  return logs.filter((log) => {
    return topics.every((topic, index) => !topic || topic === log.topics[index]);
  });
};
