import { AbstractIdentity, EventTypes, Entities, Message } from 'daf-core'
import { ActionSendDIDComm, ActionTypes } from 'daf-did-comm'
import { ActionSignW3cVc } from 'daf-w3c'
import { agent } from './setup'
import { createConnection } from 'typeorm'

async function main() {
  // Create database connection
  await createConnection({
    type: 'sqlite',
    database: 'database.sqlite',
    synchronize: true,
    logging: true,
    entities: Entities,
  })

  // Getting existing identity or creating a new one
  let identity: AbstractIdentity
  const identities = await agent.identityManager.getIdentities()
  if (identities.length > 0) {
    identity = identities[0]
  } else {
    const identityProviders = await agent.identityManager.getIdentityProviders()
    identity = await agent.identityManager.createIdentity(identityProviders[0].type)
  }

  // Sign verifiable credential
  const vcJwt = await agent.handleAction({
    type: 'action.sign.w3c.vc',
    did: identity.did,
    data: {
      sub: 'did:web:uport.me',
      vc: {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
        credentialSubject: {
          you: 'Rock',
        },
      },
    },
  } as ActionSignW3cVc)

  // Send verifiable credential using DIDComm
  await agent.handleAction({
    type: ActionTypes.sendMessageDIDCommAlpha1,
    data: {
      from: identity.did,
      to: 'did:web:uport.me',
      type: 'jwt',
      body: vcJwt,
    },
  } as ActionSendDIDComm)
}

// This is triggered when DAF successfully saves a new message
// which can arrive from external services, or by sending it using `action.sendJwt`
agent.on(EventTypes.savedMessage, async (message: Message) => {
  console.log('\n\nSuccessfully sent message:', message)
})

main().catch(console.log)
