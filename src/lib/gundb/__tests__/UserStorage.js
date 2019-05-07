// @flow
import Gun from '@gooddollar/gun-appendonly'
import extend from '../gundb-extend'
import gun from '../gundb'
import userStorage, { type TransactionEvent, UserStorage } from '../UserStorage'
import { getUserModel } from '../UserModel'
import { addUser } from './__util__/index'
import { GoodWallet } from '../../wallet/GoodWallet'
import { deleteMnemonics } from '../../wallet/SoftwareWalletProvider'

let event = { id: 'xyz', date: new Date('2019-01-01T10:00:00.000Z').toString(), data: { foo: 'bar', unchanged: 'zar' } }
let event2 = { id: 'xyz2', date: new Date('2019-01-01T20:00:00.000Z').toString(), data: { foo: 'bar' } }
let event3 = { id: 'xyz3', date: new Date('2019-01-01T14:00:00.000Z').toString(), data: { foo: 'xar' } }
let mergedEvent = {
  id: 'xyz',
  date: new Date('2019-01-01').toString(),
  data: { foo: 'zar', unchanged: 'zar', extra: 'bar' }
}
let event4 = {
  id: 'xyz4',
  date: new Date('2019-01-02T10:00:00.000Z').toString(),
  data: { foo: 'bar', unchanged: 'zar' }
}

const createNewUserStorage = async () => {
  await Promise.all([userStorage.wallet.ready, userStorage.ready])
  deleteMnemonics()
  const wallet = new GoodWallet()
  const newUserStorage = new UserStorage(wallet)
  return Promise.all([newUserStorage.wallet.ready, newUserStorage.ready]).then(() => newUserStorage)
}

describe('UserStorage', () => {
  beforeAll(async () => {
    jest.setTimeout(30000)
    await userStorage.wallet.ready
    console.debug('wallet ready...')
    await userStorage.ready
    console.log('storage ready...')
  })

  afterEach(() => {
    userStorage.unSubscribeProfileUpdates()
  })

  it('logins to gundb', async () => {
    expect(userStorage.user).not.toBeUndefined()
  })

  it('sets gundb field', async () => {
    const res = await userStorage.profile
      .get('x')
      .put({ z: 1, y: 1 })
      .then()
    expect(res).toEqual(expect.objectContaining({ z: 1, y: 1 }))
  })

  it('updates gundb field', done => {
    const gunRes = userStorage.profile.get('x').put({ z: 2, y: 2 }, async v => {
      let res = await userStorage.profile.get('x').then()
      expect(res).toEqual(expect.objectContaining({ z: 2, y: 2 }))
      done()
    })
  })

  it('sets profile field', async () => {
    await userStorage.setProfileField('name', 'hadar', 'public')
    const res = await userStorage.profile.get('name').then()
    expect(res).toEqual(expect.objectContaining({ privacy: 'public', display: 'hadar' }))
  })

  it('update profile field', async () => {
    const ack = await userStorage.setProfileField('name', 'hadar2', 'public')
    const res = await userStorage.profile.get('name').then()
    expect(res).toEqual(expect.objectContaining({ privacy: 'public', display: 'hadar2' }))
  })

  it('gets profile field', async () => {
    const gunRes = userStorage.getProfileField('name')
    const res = await gunRes.then()
    expect(res).toEqual(expect.objectContaining({ privacy: 'public', display: 'hadar2', value: expect.anything() }))
  })

  it('sets profile field private (encrypted)', async () => {
    const gunRes = await userStorage.setProfileField('id', 'z123', 'private')
    const res = await userStorage.profile.get('id').then()
    expect(res).toEqual(expect.objectContaining({ privacy: 'private', display: '' }))
  })

  it('profile field private is encrypted', async () => {
    const res = await userStorage.profile
      .get('id')
      .get('value')
      .then()
    expect(Object.keys(res)).toEqual(['ct', 'iv', 's'])
  })

  it('gets profile field private (decrypted)', async () => {
    const gunRes = userStorage.getProfileFieldValue('id')
    const res = await gunRes.then()
    expect(res).toEqual('z123')
  })

  describe('gets profile name and avatar from value', async () => {
    beforeAll(async () => {
      await addUser({
        identifier: 'abcdef',
        walletAddress: 'walletabcdef',
        fullName: 'Kevin Bardi',
        username: 'kvardi',
        mobile: '22233445566',
        email: 'kevin.bardi@altoros.com'
      })
      await addUser({
        identifier: 'ghijkl',
        walletAddress: 'walletghijkl',
        fullName: 'Fernando Greco',
        mobile: '22244556677',
        email: 'fernando.greco@altoros.com'
      })
      await addUser({
        identifier: 'mnopqr',
        walletAddress: 'walletmnopqr',
        fullName: 'Dario Miñones',
        mobile: '22255667788',
        email: 'dario.minones@altoros.com'
      })
    })

    it('returns object with user fullName for existing user identifier', async () => {
      const userProfile = await userStorage.getUserProfile('walletabcdef')
      expect(userProfile).toEqual(expect.objectContaining({ name: 'Kevin Bardi' }))
    })

    it("returns object with 'Unknown name' fullName for fake user identifier", async () => {
      const userProfile = await userStorage.getUserProfile('fake')
      expect(userProfile).toEqual(expect.objectContaining({ name: 'Unknown Name' }))
    })
  })

  // describe('generates standarised feed from events', async () => {
  //   beforeAll(async () => {
  //     await addUser({
  //       identifier: 'abcdef',
  //       walletAddress: 'walletabcdef',
  //       fullName: 'Kevin Bardi',
  //       mobile: '22233445566',
  //       email: 'kevin.bardi@altoros.com'
  //     })
  //     await addUser({
  //       identifier: 'ghijkl',
  //       walletAddress: 'walletghijkl',
  //       fullName: 'Fernando Greco',
  //       mobile: '22244556677',
  //       email: 'fernando.greco@altoros.com'
  //     })
  //     await addUser({
  //       identifier: 'mnopqr',
  //       walletAddress: 'walletmnopqr',
  //       fullName: 'Dario Miñones',
  //       mobile: '22255667788',
  //       email: 'dario.minones@altoros.com'
  //     })

  //     const gunRes = await userStorage.updateFeedEvent(event)
  //     const index = await userStorage.feed
  //       .get('index')
  //       .once()
  //       .then()
  //   })
  //   it ('StandardizeFeed must return the feed with specific object structure', async () => {

  //   })
  // })

  it('sets profile email field masked', async () => {
    const gunRes = await userStorage.setProfileField('email', 'johndoe@blah.com', 'masked')
    const res = await userStorage.profile.get('email').then()
    expect(res).toEqual(expect.objectContaining({ privacy: 'masked', display: 'j*****e@blah.com' }))
  })

  it('sets profile mobile field masked', async () => {
    const gunRes = await userStorage.setProfileField('mobile', '+972-50-7384928', 'masked')
    const res = await userStorage.profile.get('mobile').then()
    expect(res).toEqual(expect.objectContaining({ privacy: 'masked', display: '***********4928' }))
  })

  it('sets profile phone field masked', async () => {
    const gunRes = await userStorage.setProfileField('phone', '+972-50-7384928', 'masked')
    const res = await userStorage.profile.get('phone').then()
    expect(res).toEqual(expect.objectContaining({ privacy: 'masked', display: '***********4928' }))
  })

  it('doesnt mask non email/phone profile fields', async () => {
    const gunRes = await userStorage.setProfileField('name', 'John Doe', 'masked')
    const res = await userStorage.profile.get('name').then()
    expect(res).toEqual(expect.objectContaining({ privacy: 'public', display: 'John Doe' }))
  })

  it('change profile field privacy to public', async () => {
    const result = await userStorage.setProfileField('phone', '+972-50-7384928', 'masked')
    expect(result).toMatchObject({ err: undefined })
    const before = await userStorage.profile.get('phone').then()
    expect(before).toMatchObject({ privacy: 'masked', display: '***********4928' })

    const gunRes = await userStorage.setProfileFieldPrivacy('phone', 'public')
    expect(gunRes).toMatchObject({ err: undefined })

    const after = await userStorage.profile.get('phone').then()
    expect(after).toMatchObject({ privacy: 'public', display: '+972-50-7384928' })
  })

  it('change profile field privacy to private', async () => {
    const gunRes = await userStorage.setProfileFieldPrivacy('phone', 'private')
    const res = await userStorage.profile.get('phone').then()
    expect(res).toEqual(expect.objectContaining({ privacy: 'private', display: '' }))
  })

  it('add event', async () => {
    const gunRes = await userStorage.updateFeedEvent(event)
    const index = await userStorage.feed
      .get('index')
      .once()
      .then()
    const events = await userStorage.getAllFeed()
    expect(index).toHaveProperty('2019-01-01')
    expect(events).toContainEqual(event)
  })

  it('add second event', async () => {
    await userStorage.updateFeedEvent(event)
    await userStorage.updateFeedEvent(event2)
    const index = await userStorage.feed
      .get('index')
      .once()
      .then()
    const events = await userStorage.getAllFeed()
    expect(index['2019-01-01']).toBeGreaterThanOrEqual(2)
    expect(events).toContainEqual(event2)
    expect(events).toContainEqual(event)
  })

  it('updates first event', async () => {
    await userStorage.updateFeedEvent(event)

    let updatedEvent = { ...event, date: new Date('2019-01-01').toString(), data: { foo: 'zar', extra: 'bar' } }
    const gunRes = await userStorage.updateFeedEvent(updatedEvent)
    const index = await userStorage.feed
      .get('index')
      .once()
      .then()
    const events = await userStorage.getAllFeed()
    expect(index['2019-01-01']).toBeGreaterThanOrEqual(1)
    expect(events).toContainEqual(updatedEvent)
  })

  it('add middle event', async () => {
    await userStorage.updateFeedEvent(mergedEvent)
    await userStorage.updateFeedEvent(event2)
    await userStorage.updateFeedEvent(event3)
    const index = await userStorage.feed
      .get('index')
      .once()
      .then()
    const events = await userStorage.getAllFeed()
    expect(index['2019-01-01']).toBeGreaterThanOrEqual(3)
    expect([event2, event3, mergedEvent]).toEqual(expect.arrayContaining(events))
  })

  it('keeps event index sorted', async () => {
    const gunRes = await userStorage.updateFeedEvent(event4)
    const index = await userStorage.feed
      .get('index')
      .once()
      .then()
    const events = await userStorage.feed.get('2019-01-02').then()
    expect(index['2019-01-02']).toEqual(1)
    expect(events.map(event => event.id)).toEqual([event4.id])
  })

  it('gets events first page', async () => {
    const gunRes = await userStorage.getFeedPage(2)
    expect(gunRes.length).toEqual(4)
  })

  it('gets events second page', async () => {
    const gunRes = await userStorage.getFeedPage(2)
    expect(gunRes.length).toEqual(0)
  })

  it('resets cursor and get events single day page', async () => {
    const gunRes = await userStorage.getFeedPage(1, true)
    expect(gunRes.length).toEqual(1)
  })

  it('add TransactionEvent event', async () => {
    const date = '2020-01-01'
    const transactionEvent: TransactionEvent = {
      id: 'xyz32',
      date: new Date(date).toString(),
      type: 'send',
      data: {
        to: 'Mike',
        reason: 'For the pizza',
        amount: 3,
        sendLink: 'http://fake.link/string',
        receipt: { foo: 'foo' }
      }
    }
    const gunRes = await userStorage.updateFeedEvent(transactionEvent)
    const index = await userStorage.feed
      .get('index')
      .once()
      .then()
    const events = await userStorage.getAllFeed()
    expect(index).toHaveProperty(date)
    expect(events).toContainEqual(transactionEvent)
  })

  it('gets profiles field', async done => {
    await userStorage.setProfileField('email', 'johndoe@blah.com', 'masked')
    await userStorage.setProfileField('name', 'hadar2', 'public')
    await userStorage.setProfileField('id', 'z123', 'private')

    userStorage.subscribeProfileUpdates(profile => {
      expect(profile.email.display).toEqual('j*****e@blah.com')
      expect(profile.name.display).toEqual('hadar2')
      expect(profile.id.display).toEqual('')
      done()
    })
  })

  it('set indexable field as empty should throw an error', async () => {
    const response = await userStorage.setProfileField('mobile', '', 'public')
    expect(response).toMatchObject({ err: 'Indexable field cannot be null or empty' })
  })

  it('gets display profile', async done => {
    await userStorage.setProfileField('x', '', 'public')
    await userStorage.setProfileField('mobile', '+22222222222', 'public')
    await userStorage.setProfileField('phone', '+22222222222', 'public')
    await userStorage.setProfileField('email', 'johndoe@blah.com', 'masked')
    await userStorage.setProfileField('name', 'hadar2', 'public')
    await userStorage.setProfileField('id', 'z123', 'private')

    userStorage.subscribeProfileUpdates(profile => {
      console.log(profile)

      userStorage.getDisplayProfile(profile).then(result => {
        const { isValid, getErrors, validate, ...displayProfile } = result
        expect(displayProfile).toEqual({
          id: '',
          name: 'hadar2',
          email: 'j*****e@blah.com',
          phone: '+22222222222',
          mobile: '+22222222222',
          x: ''
        })
        done()
      })
    })
  })

  it('gets private profile', async done => {
    await userStorage.setProfileField('x', '', 'public')
    await userStorage.setProfileField('mobile', '+22222222222', 'public')
    await userStorage.setProfileField('phone', '+22222222222', 'public')
    await userStorage.setProfileField('email', 'johndoe@blah.com', 'masked')
    await userStorage.setProfileField('name', 'hadar2', 'public')
    await userStorage.setProfileField('id', 'z123', 'private')
    await userStorage.subscribeProfileUpdates(profile => {
      userStorage.getPrivateProfile(profile).then(result => {
        const { isValid, getErrors, validate, ...privateProfile } = result

        expect(privateProfile).toEqual({
          id: 'z123',
          name: 'hadar2',
          email: 'johndoe@blah.com',
          phone: '+22222222222',
          mobile: '+22222222222',
          x: ''
        })
        done()
      })
    })
  })

  it('update profile field uses privacy settings', async done => {
    // Making sure that privacy default is not override in other tests
    await userStorage.setProfileField('fullName', 'Old Name', 'public')
    await userStorage.setProfileField('mobile', '+22222222211', 'masked')
    await userStorage.setProfileField('email', 'new@domain.com', 'masked')

    const profileData = {
      fullName: 'New Name',
      email: 'new@email.com',
      mobile: '+22222222222',
      username: 'hadar2'
    }
    const profile = getUserModel(profileData)
    const result = await userStorage.setProfile(profile)
    expect(result).toBe(true)
    await userStorage.subscribeProfileUpdates(updatedProfile => {
      Promise.all([
        userStorage.getPrivateProfile(updatedProfile).then(result => {
          const { isValid, getErrors, validate, ...privateProfile } = result

          expect(privateProfile).toMatchObject(profileData)
        }),
        userStorage.getDisplayProfile(updatedProfile).then(result => {
          const { isValid, getErrors, validate, ...displayProfile } = result

          expect(displayProfile).toMatchObject({
            fullName: 'New Name',
            email: 'n*w@email.com',
            mobile: '********2222',
            username: 'hadar2'
          })
        })
      ]).then(() => done())
    })
  })

  it(`update profile doesn't change privacy settings`, async done => {
    const email = 'johndoe@blah.com'
    await userStorage.setProfileField('email', email, 'public')
    await userStorage.setProfile(getUserModel({ email, fullName: 'full name', mobile: '+22222222222' }))
    await userStorage.subscribeProfileUpdates(updatedProfile => {
      userStorage.getDisplayProfile(updatedProfile).then(result => {
        expect(result.email).toBe(email)
        done()
      })
    })
  })

  it(`update username success`, async () => {
    await Promise.all([userStorage.wallet.ready, userStorage.ready])
    const result = await userStorage.setProfileField('username', 'user1', 'public')
    await userStorage.setProfileField('email', 'user1', 'public')
    expect(result).toMatchObject({ err: undefined, ok: 0 })

    const updatedUsername = await userStorage.getProfileFieldValue('username')
    expect(updatedUsername).toBe('user1')
  })

  it(`update username with setProfile should not update profile if username is taken`, async () => {
    const oldPub = JSON.stringify(userStorage.gunuser.is.pub)
    const profileModel = getUserModel({
      fullName: 'New Name',
      email: 'new@email.com',
      mobile: '+22222222222',
      username: 'user5'
    })
    const result = await userStorage.setProfile(profileModel)
    expect(result).toBe(true)

    const newUserStorage = await createNewUserStorage()
    expect(newUserStorage.gunuser.is.pub).not.toBe(oldPub)

    try {
      await newUserStorage.setProfile({
        ...profileModel,
        email: 'diferent@email.com',
        mobile: '+22222222221'
      })
    } catch (e) {
      expect(e).toEqual(new Error(['Existing index on field username']))
    }
    const updatedUsername = await newUserStorage.getProfileFieldValue('username')
    expect(updatedUsername).toBe(undefined)
  })

  it(`update username with used username should fail`, async done => {
    const userStorage = await createNewUserStorage()
    const oldPub = JSON.stringify(userStorage.gunuser.is.pub)
    const result = await userStorage.setProfileField('username', 'user2', 'public')
    expect(result).toMatchObject({ err: undefined, ok: 0 })
    const newUserStorage = await createNewUserStorage()
    expect(newUserStorage.gunuser.is.pub).not.toBe(oldPub)

    const newResult = await newUserStorage.setProfileField('username', 'user2', 'public')
    expect(newResult).toMatchObject({ err: 'Existing index on field username', ok: 0 })
    const updatedUsername = await newUserStorage.getProfileFieldValue('username')
    expect(updatedUsername).toBeUndefined()

    const newResultOk = await newUserStorage.setProfileField('username', 'user3', 'public')
    expect(newResultOk).toMatchObject({ err: undefined })
    const updatedUsernameOk = await newUserStorage.getProfileFieldValue('username')
    expect(updatedUsernameOk).toBe('user3')
    done()
  })
})
