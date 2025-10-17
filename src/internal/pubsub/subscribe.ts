import amqp from 'amqplib'
import { declareAndBind, SimpleQueueType } from './publish.js'

export enum ackType {
  Ack,
  NackRequeue,
  NackDiscard
}

export async function subscribeJSON<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
  handler: (data: T) => ackType,
): Promise<void> {
  const [ channel, queue ] = await declareAndBind(
    conn,
    exchange,
    queueName,
    key,
    queueType
  )
  channel.consume(queue.queue, (msg: amqp.ConsumeMessage | null) => {
    if (msg === null) {
      return
    }
    const content = JSON.parse(msg.content.toString())
    handler(content)
    channel.ack(msg)
  })
}