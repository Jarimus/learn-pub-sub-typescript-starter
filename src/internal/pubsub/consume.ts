import amqp from 'amqplib'
import { SimpleQueueType } from './publish.js'
import msgPack from '@msgpack/msgpack'

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
    const acktype = handler(content)
    switch (acktype) {
      case ackType.Ack:
        channel.ack(msg)
        break;
      case ackType.NackDiscard:
        channel.nack(msg, false, false)
        break;
      case ackType.NackRequeue:
        channel.nack(msg, false, true)
      default:
        break;
    }
  })
}

export async function subscribeMsgPack<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
  handler: (data: T) => ackType | Promise<ackType>,
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
    let content: T
    try {
      content = msgPack.decode(msg.content) as T
    } catch (error) {
      console.error('Could not decode message', error)
      return
    }
      const acktype = handler(content)
      switch (acktype) {
        case ackType.Ack:
          channel.ack(msg)
          break;
        case ackType.NackDiscard:
          channel.nack(msg, false, false)
          break;
        case ackType.NackRequeue:
          channel.nack(msg, false, true)
        default:
          break;
      }
    })
}

export async function declareAndBind(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
): Promise<[amqp.Channel, amqp.Replies.AssertQueue]> {

  const channel = await conn.createConfirmChannel()
  const queue = await channel.assertQueue(
    queueName, {
      durable: queueType === SimpleQueueType.Durable,
      autoDelete: queueType !== SimpleQueueType.Durable,
      exclusive: queueType !== SimpleQueueType.Durable,
      arguments: { "x-dead-letter-exchange": "peril_dlx" }
  })
  await channel.bindQueue(queueName, exchange, key)
  return [channel, queue]
}