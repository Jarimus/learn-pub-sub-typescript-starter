import type { Channel, ConfirmChannel } from "amqplib";
import amqp from 'amqplib'

export enum SimpleQueueType {
  Durable,
  Transient,
}

export async function publishJSON<T>(
  ch: ConfirmChannel,
  exchange: string,
  routingKey: string,
  value: T,
): Promise<void> {
  const valueString = JSON.stringify(value)
  ch.publish(exchange, routingKey, Buffer.from(valueString), { contentType: 'application/json'})
}

export async function declareAndBind(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
): Promise<[Channel, amqp.Replies.AssertQueue]> {

  const channel = await conn.createConfirmChannel()
  const queue = await channel.assertQueue(queueName, {
    durable: queueType === SimpleQueueType.Durable,
    autoDelete: queueType !== SimpleQueueType.Durable,
    exclusive: queueType !== SimpleQueueType.Durable,
  })
  await channel.bindQueue(queueName, exchange, key)
  return [channel, queue]
}